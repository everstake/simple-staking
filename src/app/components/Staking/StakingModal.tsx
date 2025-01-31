import { useQuery } from "@tanstack/react-query";
import { Transaction, networks } from "bitcoinjs-lib";
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import { IoMdClose } from "react-icons/io";

import { OVERFLOW_HEIGHT_WARNING_THRESHOLD } from "@/app/common/constants";
import { LoadingView } from "@/app/components/Loading/Loading";
import { useError } from "@/app/context/Error/ErrorContext";
import { useGlobalParams } from "@/app/context/api/GlobalParamsProvider";
import { useStakingStats } from "@/app/context/api/StakingStatsProvider";
import { Delegation } from "@/app/types/delegations";
import { ErrorHandlerParam, ErrorState } from "@/app/types/errors";
import { FinalityProvider as FinalityProviderInterface } from "@/app/types/finalityProviders";
import { getNetworkConfig } from "@/config/network.config";
import { satoshiToBtc } from "@/utils/btcConversions";
import {
  createStakingTx,
  signStakingTx,
} from "@/utils/delegations/signStakingTx";
import { getFeeRateFromMempool } from "@/utils/getFeeRateFromMempool";
import {
  ParamsWithContext,
  getCurrentGlobalParamsVersion,
} from "@/utils/globalParams";
import { isStakingSignReady } from "@/utils/isStakingSignReady";
import { toLocalStorageDelegation } from "@/utils/local_storage/toLocalStorageDelegation";
import { WalletProvider } from "@/utils/wallet/wallet_provider";

import { GeneralModal } from "../Modals/GeneralModal";
import { PreviewModal } from "../Modals/PreviewModal";

import { StakingAmount } from "./Form/StakingAmount";
import { StakingFee } from "./Form/StakingFee";
import { Message } from "./Form/States/Message";
import { WalletNotConnected } from "./Form/States/WalletNotConnected";
import stakingCapReached from "./Form/States/staking-cap-reached.svg";
import stakingNotStarted from "./Form/States/staking-not-started.svg";
import stakingUpgrading from "./Form/States/staking-upgrading.svg";

interface OverflowProperties {
  isHeightCap: boolean;
  overTheCapRange: boolean;
  approchingCapRange: boolean;
}

interface StakingModalProps {
  open: boolean;
  onClose: (value: boolean) => void;
  btcHeight: number | undefined;
  finalityProvider: FinalityProviderInterface;
  isWalletConnected: boolean;
  isLoading: boolean;
  onConnect: () => void;
  btcWallet: WalletProvider | undefined;
  btcWalletBalanceSat: number;
  btcWalletNetwork: networks.Network | undefined;
  address: string | undefined;
  publicKeyNoCoord: string;
  setDelegationsLocalStorage: Dispatch<SetStateAction<Delegation[]>>;
  onStakeSuccess: (value: string) => void;
}

export const StakingModal: React.FC<StakingModalProps> = ({
  btcHeight,
  finalityProvider,
  isWalletConnected,
  onConnect,
  isLoading,
  btcWallet,
  btcWalletNetwork,
  address,
  publicKeyNoCoord,
  setDelegationsLocalStorage,
  btcWalletBalanceSat,
  open,
  onClose,
  onStakeSuccess,
}) => {
  // Staking form state
  const [stakingAmountSat, setStakingAmountSat] = useState(0);
  const [stakingTimeBlocks, setStakingTimeBlocks] = useState(64000);
  // Selected fee rate, comes from the user input
  const [selectedFeeRate, setSelectedFeeRate] = useState(1);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [resetFormInputs, setResetFormInputs] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);
  const [error, setError] = useState("");
  const [paramWithCtx, setParamWithCtx] = useState<
    ParamsWithContext | undefined
  >();
  const [overflow, setOverflow] = useState<OverflowProperties>({
    isHeightCap: false,
    overTheCapRange: false,
    approchingCapRange: false,
  });

  // Mempool fee rates, comes from the network
  // Fetch fee rates, sat/vB
  const {
    data: mempoolFeeRates,
    error: mempoolFeeRatesError,
    isError: hasMempoolFeeRatesError,
    refetch: refetchMempoolFeeRates,
  } = useQuery({
    queryKey: ["mempool fee rates"],
    queryFn: async () => {
      if (btcWallet?.getNetworkFees) {
        return await btcWallet.getNetworkFees();
      }
    },
    enabled: !!btcWallet?.getNetworkFees,
    refetchInterval: 60000, // 1 minute
    retry: (failureCount) => {
      return !isErrorOpen && failureCount <= 3;
    },
  });

  // Fetch all UTXOs
  const {
    data: availableUTXOs,
    error: availableUTXOsError,
    isError: hasAvailableUTXOsError,
    refetch: refetchAvailableUTXOs,
  } = useQuery({
    queryKey: ["available UTXOs", address],
    queryFn: async () => {
      if (btcWallet?.getUtxos && address) {
        return await btcWallet.getUtxos(address);
      }
    },
    enabled: !!(btcWallet?.getUtxos && address),
    refetchInterval: 60000 * 5, // 5 minutes
    retry: (failureCount) => {
      return !isErrorOpen && failureCount <= 3;
    },
  });

  const stakingStats = useStakingStats();

  // load global params and calculate the current staking params
  const globalParams = useGlobalParams();
  useMemo(() => {
    if (!btcHeight || !globalParams.data) {
      return;
    }
    const paramCtx = getCurrentGlobalParamsVersion(
      btcHeight + 1,
      globalParams.data,
    );
    setParamWithCtx(paramCtx);
  }, [btcHeight, globalParams]);

  // Calculate the overflow properties
  useMemo(() => {
    if (!paramWithCtx || !paramWithCtx.currentVersion || !btcHeight) {
      return;
    }
    const nextBlockHeight = btcHeight + 1;
    const { stakingCapHeight, stakingCapSat, confirmationDepth } =
      paramWithCtx.currentVersion;
    // Use height based cap than value based cap if it is set
    if (stakingCapHeight) {
      setOverflow({
        isHeightCap: true,
        overTheCapRange:
          nextBlockHeight >= stakingCapHeight + confirmationDepth,
        /*
          When btc height is approching the staking cap height,
          there is higher chance of overflow due to tx not being included in the next few blocks on time
          We also don't take the confirmation depth into account here as majority
          of the delegation will be overflow after the cap is reached, unless btc fork happens but it's unlikely
        */
        approchingCapRange:
          nextBlockHeight >=
          stakingCapHeight - OVERFLOW_HEIGHT_WARNING_THRESHOLD,
      });
    } else if (stakingCapSat && stakingStats.data) {
      const { activeTVLSat, unconfirmedTVLSat } = stakingStats.data;
      setOverflow({
        isHeightCap: false,
        overTheCapRange: stakingCapSat <= activeTVLSat,
        approchingCapRange:
          stakingCapSat * OVERFLOW_HEIGHT_WARNING_THRESHOLD < unconfirmedTVLSat,
      });
    }
  }, [paramWithCtx, btcHeight, stakingStats]);

  const { coinName } = getNetworkConfig();
  const stakingParams = paramWithCtx?.currentVersion;
  const firstActivationHeight = paramWithCtx?.firstActivationHeight;
  const isUpgrading = paramWithCtx?.isApprochingNextVersion;
  const isBlockHeightUnderActivation =
    !stakingParams ||
    (btcHeight &&
      firstActivationHeight &&
      btcHeight + 1 < firstActivationHeight);

  const { isErrorOpen, showError } = useError();

  useEffect(() => {
    const handleError = ({
      error,
      hasError,
      errorState,
      refetchFunction,
    }: ErrorHandlerParam) => {
      if (hasError && error) {
        showError({
          error: {
            message: error.message,
            errorState,
            errorTime: new Date(),
          },
          retryAction: refetchFunction,
        });
      }
    };

    handleError({
      error: mempoolFeeRatesError,
      hasError: hasMempoolFeeRatesError,
      errorState: ErrorState.SERVER_ERROR,
      refetchFunction: refetchMempoolFeeRates,
    });
    handleError({
      error: availableUTXOsError,
      hasError: hasAvailableUTXOsError,
      errorState: ErrorState.SERVER_ERROR,
      refetchFunction: refetchAvailableUTXOs,
    });
  }, [
    availableUTXOsError,
    mempoolFeeRatesError,
    hasMempoolFeeRatesError,
    hasAvailableUTXOsError,
    refetchMempoolFeeRates,
    refetchAvailableUTXOs,
    showError,
  ]);

  const handleResetState = () => {
    setStakingAmountSat(0);
    setStakingTimeBlocks(64000);
    setSelectedFeeRate(defaultFeeRate);
    setPreviewModalOpen(false);
    setResetFormInputs(!resetFormInputs);
    setTermsChecked(false);
  };

  const handleCheckboxChange = () => {
    setTermsChecked(!termsChecked);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const { minFeeRate, defaultFeeRate } = getFeeRateFromMempool(mempoolFeeRates);

  useEffect(() => {
    if (defaultFeeRate) {
      setSelectedFeeRate(defaultFeeRate);
    }
  }, [defaultFeeRate]);

  // Either use the selected fee rate or the fastest fee rate
  const feeRate = selectedFeeRate || defaultFeeRate;

  const handleSign = async () => {
    try {
      // Initial validation
      if (!btcWallet) throw new Error("Wallet is not connected");
      if (!address) throw new Error("Address is not set");
      if (!btcWalletNetwork) throw new Error("Wallet network is not connected");
      if (!finalityProvider)
        throw new Error("Finality provider is not selected");
      if (!paramWithCtx || !paramWithCtx.currentVersion)
        throw new Error("Global params not loaded");
      if (!feeRate) throw new Error("Fee rates not loaded");
      if (!availableUTXOs || availableUTXOs.length === 0)
        throw new Error("No available balance");

      const { currentVersion: globalParamsVersion } = paramWithCtx;
      // Sign the staking transaction
      const { stakingTxHex, stakingTerm } = await signStakingTx(
        btcWallet,
        globalParamsVersion,
        stakingAmountSat,
        stakingTimeBlocks,
        finalityProvider.btcPk,
        btcWalletNetwork,
        address,
        publicKeyNoCoord,
        feeRate,
        availableUTXOs,
      );
      // UI
      const stakingTxHash = Transaction.fromHex(stakingTxHex).getId();
      const { mempoolApiUrl } = getNetworkConfig();
      onStakeSuccess(`${mempoolApiUrl}/tx/${stakingTxHash}`);
      onClose(false);
      handleLocalStorageDelegations(stakingTxHex, stakingTerm);
      handleResetState();
    } catch (error: Error | any) {
      showError({
        error: {
          message: error.message,
          errorState: ErrorState.STAKING,
          errorTime: new Date(),
        },
        retryAction: handleSign,
      });
    }
  };

  // Save the delegation to local storage
  const handleLocalStorageDelegations = (
    signedTxHex: string,
    stakingTerm: number,
  ) => {
    setDelegationsLocalStorage((delegations) => [
      toLocalStorageDelegation(
        Transaction.fromHex(signedTxHex).getId(),
        publicKeyNoCoord,
        finalityProvider!.btcPk,
        stakingAmountSat,
        signedTxHex,
        stakingTerm,
      ),
      ...delegations,
    ]);
  };

  // Memoize the staking fee calculation
  const stakingFeeSat = useMemo(() => {
    if (
      btcWalletNetwork &&
      address &&
      publicKeyNoCoord &&
      stakingAmountSat &&
      finalityProvider &&
      paramWithCtx?.currentVersion &&
      mempoolFeeRates &&
      availableUTXOs
    ) {
      try {
        // check that selected Fee rate (if present) is bigger than the min fee
        if (selectedFeeRate && selectedFeeRate < minFeeRate) {
          throw new Error("Selected fee rate is lower than the hour fee");
        }
        const memoizedFeeRate = selectedFeeRate || defaultFeeRate;
        // Calculate the staking fee
        const { stakingFeeSat } = createStakingTx(
          paramWithCtx.currentVersion,
          stakingAmountSat,
          stakingTimeBlocks,
          finalityProvider.btcPk,
          btcWalletNetwork,
          address,
          publicKeyNoCoord,
          memoizedFeeRate,
          availableUTXOs,
        );
        return stakingFeeSat;
      } catch (error: Error | any) {
        console.log(error);
        // fees + staking amount can be more than the balance
        showError({
          error: {
            message: error.message,
            errorState: ErrorState.STAKING,
            errorTime: new Date(),
          },
          retryAction: () => setSelectedFeeRate(defaultFeeRate),
        });
        setSelectedFeeRate(defaultFeeRate);
        return 0;
      }
    } else {
      return 0;
    }
  }, [
    btcWalletNetwork,
    address,
    publicKeyNoCoord,
    stakingAmountSat,
    stakingTimeBlocks,
    finalityProvider,
    paramWithCtx,
    mempoolFeeRates,
    availableUTXOs,
    showError,
    defaultFeeRate,
    minFeeRate,
    selectedFeeRate,
  ]);

  const handleStakingAmountSatChange = (inputAmountSat: number) => {
    setStakingAmountSat(inputAmountSat);
  };

  const handleStakingTimeBlocksChange = (inputTimeBlocks: number) => {
    setStakingTimeBlocks(inputTimeBlocks);
  };

  const [overflowWarningVisible, setOverflowWarningVisible] = useState(false);

  useEffect(() => {
    if (overflow.isHeightCap || isBlockHeightUnderActivation || isUpgrading) {
      setOverflowWarningVisible(true);
    }
    setOverflowWarningVisible(false);
  }, [overflow.isHeightCap, isBlockHeightUnderActivation, isUpgrading]);

  const showOverflowWarning = (overflow: OverflowProperties) => {
    if (overflow.isHeightCap) {
      return (
        <Message
          onClose={onClose}
          title="Staking window closed"
          messages={[
            "Staking is temporarily disabled due to the staking window being closed.",
            "Please check your staking history to see if any of your stake is tagged overflow.",
            "Overflow stake should be unbonded and withdrawn.",
          ]}
          icon={stakingCapReached}
        />
      );
    } else {
      return (
        <Message
          onClose={onClose}
          title="Staking cap reached"
          messages={[
            "Staking is temporarily disabled due to the staking cap getting reached.",
            "Please check your staking history to see if any of your stake is tagged overflow.",
            "Overflow stake should be unbonded and withdrawn.",
          ]}
          icon={stakingCapReached}
        />
      );
    }
  };

  const showApproachingCapWarning = () => {
    if (!overflow.approchingCapRange) {
      return;
    }
    if (overflow.isHeightCap) {
      return (
        <p className="text-center text-sm text-error">
          Staking window is closing. Your stake may <b>overflow</b>!
        </p>
      );
    }
    return (
      <p className="text-center text-sm text-error">
        Staking cap is filling up. Your stake may <b>overflow</b>!
      </p>
    );
  };

  const renderStakingForm = () => {
    // States of the staking form:
    // 1. Wallet is not connected
    if (!isWalletConnected) {
      return <WalletNotConnected onConnect={onConnect} />;
    }
    // 2. Wallet is connected but we are still loading the staking params
    else if (isLoading) {
      return <LoadingView />;
    }
    // 3. Staking has not started yet
    else if (isBlockHeightUnderActivation) {
      return (
        <Message
          onClose={onClose}
          title="Staking has not yet started"
          messages={[
            `Staking will be activated once ${coinName} block height passes ${firstActivationHeight ? firstActivationHeight - 1 : "-"}. The current ${coinName} block height is ${btcHeight || "-"}.`,
          ]}
          icon={stakingNotStarted}
        />
      );
    }
    // 4. Staking params upgrading
    else if (isUpgrading) {
      return (
        <Message
          onClose={onClose}
          title="Staking parameters upgrading"
          messages={[
            "The staking parameters are getting upgraded, staking will be re-enabled soon.",
          ]}
          icon={stakingUpgrading}
        />
      );
    }
    // 5. Staking cap reached
    else if (overflow.overTheCapRange) {
      return showOverflowWarning(overflow);
    }
    // 6. Staking form
    else {
      const {
        minStakingAmountSat,
        maxStakingAmountSat,
        minStakingTimeBlocks,
        maxStakingTimeBlocks,
        unbondingTime,
        confirmationDepth,
      } = stakingParams;

      // Staking time is fixed
      const stakingTimeFixed = minStakingTimeBlocks === maxStakingTimeBlocks;

      // Takes into account the fixed staking time
      const stakingTimeBlocksWithFixed = stakingTimeFixed
        ? minStakingTimeBlocks
        : stakingTimeBlocks;

      // Check if the staking transaction is ready to be signed
      const { isReady: signReady, reason: signNotReadyReason } =
        isStakingSignReady(
          minStakingAmountSat,
          maxStakingAmountSat,
          minStakingTimeBlocks,
          maxStakingTimeBlocks,
          stakingAmountSat,
          stakingTimeBlocksWithFixed,
          !!finalityProvider,
        );

      const previewReady =
        signReady && feeRate && availableUTXOs && stakingAmountSat;

      return (
        <>
          <div className="flex flex-col items-center px-9 relative">
            <div className="absolute right-4 -top-4">
              <button
                className="btn btn-circle btn-ghost btn-sm"
                onClick={() => onClose(false)}
              >
                <IoMdClose size={24} />
              </button>
            </div>
            <div className="mb-8 flex flex-col gap-4">
              <h3 className="text-center font-semibold text-xl uppercase">
                Stake Bitcoin
              </h3>
            </div>

            <StakingAmount
              minStakingAmountSat={minStakingAmountSat}
              maxStakingAmountSat={maxStakingAmountSat}
              btcWalletBalanceSat={btcWalletBalanceSat}
              onStakingAmountSatChange={handleStakingAmountSatChange}
              onError={handleError}
              reset={resetFormInputs}
              stakingFeeSat={stakingFeeSat}
            />
            <div className="flex justify-between w-full mt-3 mb-14">
              <p className="uppercase text-xs">
                <span className="text-es-text-secondary">FEE: </span>
                <span className="text-es-text font-medium">
                  {`${satoshiToBtc(stakingFeeSat)} SATOSHIS`}
                </span>
              </p>
              <p className="uppercase text-xs">
                <span className="text-es-text-secondary">BALANCE: </span>
                <span className="text-es-text font-medium">
                  {satoshiToBtc(btcWalletBalanceSat)}
                </span>
              </p>
            </div>
            {signReady && (
              <StakingFee
                mempoolFeeRates={mempoolFeeRates}
                stakingFeeSat={stakingFeeSat}
                selectedFeeRate={selectedFeeRate}
                onSelectedFeeRateChange={setSelectedFeeRate}
                reset={resetFormInputs}
              />
            )}
          </div>

          <div className="mt-auto">
            <div
              className={` py-5 px-9 bg-es-bg ${!!error ? "border-t border-t-es-error" : ""}`}
            >
              {!error && (
                <div className="flex gap-1 items-center">
                  <input
                    className="checkbox-primary checkbox"
                    type="checkbox"
                    name="terms"
                    onChange={handleCheckboxChange}
                    checked={termsChecked}
                  />
                  <span className="text-es-text-secondary">
                    By staking, you agree to our{" "}
                    <a
                      href="https://everstake.one/docs/terms-of-use.pdf"
                      target="_blank"
                      className="underline text-es-text md:hover:no-underline"
                    >
                      Terms of Use
                    </a>
                  </span>
                </div>
              )}
              {error && (
                <p
                  dangerouslySetInnerHTML={{ __html: error }}
                  className="text-center text-sm text-es-text-secondary"
                ></p>
              )}
            </div>
            <button
              className={`border-es-accent border font-medium text-3xl text-center h-20 w-full text-es-black bg-es-accent md:transition-colors disabled:opacity-70 ${
                signReady && termsChecked
                  ? "md:hover:bg-es-black md:hover:text-es-accent"
                  : ""
              }`}
              onClick={() => setPreviewModalOpen(true)}
              disabled={!signReady || !termsChecked}
            >
              {btcWalletBalanceSat > minStakingAmountSat
                ? "CONTINUE"
                : "TOP-UP YOUR BALANCE"}
            </button>
            {previewReady && (
              <PreviewModal
                open={previewModalOpen}
                onClose={setPreviewModalOpen}
                onSign={handleSign}
                finalityProvider={finalityProvider?.description.moniker}
                stakingAmountSat={stakingAmountSat}
                stakingTimeBlocks={stakingTimeBlocksWithFixed}
                stakingFeeSat={stakingFeeSat}
                confirmationDepth={confirmationDepth}
                feeRate={feeRate}
                unbondingTimeBlocks={unbondingTime}
              />
            )}
          </div>
        </>
      );
    }
  };

  return (
    <GeneralModal
      open={open}
      onClose={onClose}
      classNames={{
        modal: `stake-modal ${overflowWarningVisible ? "stake-modal--small-h" : "stake-modal--big-h"}`,
      }}
    >
      <div className="flex flex-col flex-grow mt-8 md:max-w-[480px]">
        {renderStakingForm()}
      </div>
    </GeneralModal>
  );
};
