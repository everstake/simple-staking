import Image from "next/image";
import { useState } from "react";
import { IoMdClose } from "react-icons/io";

import bitcoinWhite from "@/app/assets/bitcoin-white.svg";
import { getNetworkConfig } from "@/config/network.config";
import { blocksToDisplayTime } from "@/utils/blocksToDisplayTime";
import { satoshiToBtc } from "@/utils/btcConversions";
import { maxDecimals } from "@/utils/maxDecimals";

import { GeneralModal } from "./GeneralModal";

export const MODE_UNBOND = "unbond";
export const MODE_WITHDRAW = "withdraw";
export type MODE = typeof MODE_UNBOND | typeof MODE_WITHDRAW;

interface PreviewModalProps {
  unbondingTimeBlocks: number;
  unbondingFeeSat: number;
  open: boolean;
  onClose: (value: boolean) => void;
  onProceed: () => void;
  mode: MODE;
}

export const UnbondWithdrawModal: React.FC<PreviewModalProps> = ({
  unbondingTimeBlocks,
  unbondingFeeSat,
  open,
  onClose,
  onProceed,
  mode,
}) => {
  const { coinName, networkName } = getNetworkConfig();

  const unbondTitle = "Unbond";

  const unbondContent = (
    <>
      <p className="mb-3">
        You are about to unbond your stake before its expiration.
      </p>
      <p className="mb-3">
        A transaction fee of{" "}
        <strong>
          {maxDecimals(satoshiToBtc(unbondingFeeSat), 8) || 0} {coinName}
        </strong>{" "}
        will be deduced from your stake by the {networkName} network.
      </p>
      <p className="mb-3">
        The expected unbonding time will be about{" "}
        <strong>{blocksToDisplayTime(unbondingTimeBlocks)}</strong>. After
        unbonded, you will need to use this dashboard to withdraw your stake for
        it to appear in your wallet.
      </p>
    </>
  );

  const withdrawTitle = "Withdraw";
  const withdrawContent = (
    <>
      <p className="mb-3">You are about to withdraw your stake. </p>
      <p className="mb-3">
        A transaction fee will be deducted from your stake by the {networkName}{" "}
        network
      </p>
    </>
  );

  const title = mode === MODE_UNBOND ? unbondTitle : withdrawTitle;
  const content = mode === MODE_UNBOND ? unbondContent : withdrawContent;

  const unbondButtonText = "UNBOND";
  const withdrawButtonText = "WITHDRAW";

  const [selectedFeeRate, setSelectedFeeRate] = useState(0);
  const [resetFormInputs, setResetFormInputs] = useState(false);

  const handleSelectedFeeRate = (fee: number) => {
    setSelectedFeeRate(fee);
  };

  return (
    <GeneralModal
      open={open}
      onClose={onClose}
      small
      classNames={{ modal: "stake-modal unbond-modal" }}
    >
      <div className="md:max-w-[480px] md:min-h-[430px] flex flex-col justify-start">
        <div className="flex flex-col mt-8 md:max-w-[480px]">
          <h3 className="text-center font-semibold text-xl uppercase">
            {mode === MODE_UNBOND ? unbondTitle : withdrawTitle}
          </h3>
          <div className="absolute right-4 top-4">
            <button
              className="btn btn-circle btn-ghost btn-sm"
              onClick={() => onClose(false)}
            >
              <IoMdClose size={24} />
            </button>
          </div>
        </div>
        {mode === MODE_WITHDRAW && (
          <div className="flex-grow flex justify-center items-start mt-10">
            <div className="flex flex-col items-center gap-6">
              <Image
                src={bitcoinWhite}
                className="opacity-70"
                style={{ width: "80px" }}
                alt="bitcoin-white"
              />
              <p className="px-9 text-es-accent font-medium">{content}</p>
            </div>
          </div>
        )}
        {mode === MODE_UNBOND && (
          <div className="flex-grow flex justify-center items-center">
            <p className="px-9 text-es-accent font-medium">{content}</p>
          </div>
        )}
        <div className="flex flex-col gap-4">
          <div className="flex gap-4 mt-auto">
            <button
              className="es-button"
              onClick={() => {
                onClose(false);
                onProceed();
              }}
            >
              {mode === MODE_UNBOND ? unbondButtonText : withdrawButtonText}
            </button>
          </div>
        </div>
      </div>
    </GeneralModal>
  );
};
