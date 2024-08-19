import Image from "next/image";
import { ChangeEvent, useEffect, useState } from "react";

import bitcoinWhite from "@/app/assets/bitcoin-white.svg";
import { getNetworkConfig } from "@/config/network.config";
import { btcToSatoshi, satoshiToBtc } from "@/utils/btcConversions";
import { maxDecimals } from "@/utils/maxDecimals";

import { validateDecimalPoints } from "./validation/validation";

interface StakingAmountProps {
  minStakingAmountSat: number;
  maxStakingAmountSat: number;
  btcWalletBalanceSat: number;
  onStakingAmountSatChange: (inputAmountSat: number) => void;
  onError?: (error: string) => void;
  reset: boolean;
  stakingFeeSat: number;
}

export const StakingAmount: React.FC<StakingAmountProps> = ({
  minStakingAmountSat,
  maxStakingAmountSat,
  btcWalletBalanceSat,
  onStakingAmountSatChange,
  onError = () => {},
  reset,
  stakingFeeSat,
}) => {
  const getFeeFromValueSat = (value: number) => {
    return value * 0.05;
  };

  const getMaxValueAfterFee = () => {
    const walletBalanceAfterFeeSat =
      btcWalletBalanceSat - getFeeFromValueSat(btcWalletBalanceSat);
    return walletBalanceAfterFeeSat > maxStakingAmountSat
      ? maxStakingAmountSat
      : walletBalanceAfterFeeSat;
  };

  const initialStakingValue = () => {
    const maxValueAfterFee = getMaxValueAfterFee();
    const value = maxDecimals(
      maxValueAfterFee < minStakingAmountSat
        ? minStakingAmountSat
        : maxValueAfterFee,
      0,
    );
    onStakingAmountSatChange(value);
    return maxDecimals(satoshiToBtc(value), 8).toString();
  };

  const [value, setValue] = useState(initialStakingValue);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(true);
  const [isMinActive, setIsMinActive] = useState(false);
  const [isMaxActive, setIsMaxActive] = useState(true);

  const errorLabel = "Staking amount";
  const generalErrorMessage = "You should input staking amount";
  const { coinName } = getNetworkConfig();

  useEffect(() => {
    const initialValue = initialStakingValue();
    setValue(initialValue);
    setError("");
    setTouched(false);
    onError("");
  }, [reset, minStakingAmountSat]);

  useEffect(() => {
    if (isMaxActive) {
      handleMaxClick();
    }
  }, [stakingFeeSat]);

  useEffect(() => {
    const numValue = parseFloat(value);
    const satoshis = btcToSatoshi(numValue);
    const maxValueAfterFee = getMaxValueAfterFee();
    const maxValue = maxDecimals(maxValueAfterFee, 0);

    setIsMinActive(satoshis === minStakingAmountSat);
    setIsMaxActive(satoshis === maxStakingAmountSat || satoshis === maxValue);
  }, [value, btcWalletBalanceSat, maxStakingAmountSat]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);

    if (touched && newValue === "") {
      const errorMsg = generalErrorMessage;
      setError(errorMsg);
      onError(errorMsg);
    } else {
      setError("");
      onError("");
    }
  };

  const handleBlur = () => {
    setTouched(true);
    if (value === "") {
      const errorMsg = generalErrorMessage;
      onStakingAmountSatChange(0);
      setError(errorMsg);
      onError(errorMsg);
      return;
    }

    const numValue = parseFloat(value);
    const satoshis = btcToSatoshi(numValue);
    const validations = [
      {
        valid: !isNaN(Number(value)),
        message: `${errorLabel} must be a valid number.`,
      },
      {
        valid: numValue !== 0,
        message: `${errorLabel} must be greater than 0.`,
      },
      {
        valid: btcWalletBalanceSat > minStakingAmountSat,
        message: `Insufficient wallet balance. <br/> Minimum staking amount is ${satoshiToBtc(minStakingAmountSat)} BTC.`,
      },
      {
        valid: satoshis >= minStakingAmountSat,
        message: `${errorLabel} must be at least ${satoshiToBtc(minStakingAmountSat)} ${coinName}.`,
      },
      {
        valid: satoshis <= maxStakingAmountSat,
        message: `${errorLabel} must be no more than ${satoshiToBtc(maxStakingAmountSat)} ${coinName}.`,
      },
      {
        valid: satoshis <= btcWalletBalanceSat,
        message: `${errorLabel} must be no more than ${satoshiToBtc(btcWalletBalanceSat)} wallet balance.`,
      },
      {
        valid: validateDecimalPoints(value),
        message: `${errorLabel} must have no more than 8 decimal points.`,
      },
    ];

    const firstInvalid = validations.find((validation) => !validation.valid);

    if (firstInvalid) {
      const errorMsg = firstInvalid.message;
      setError(errorMsg);
      onError(errorMsg);
      onStakingAmountSatChange(0);
    } else {
      setError("");
      onError("");
      onStakingAmountSatChange(satoshis);
    }
  };

  useEffect(() => {
    if (touched) {
      handleBlur();
    }
  }, [value]);

  const handleMaxClick = () => {
    setError("");
    onError("");
    const maxValueAfterFee = getMaxValueAfterFee();
    const maxValue = maxDecimals(
      satoshiToBtc(
        maxValueAfterFee < minStakingAmountSat
          ? minStakingAmountSat
          : maxValueAfterFee,
      ),
      8,
    ).toString();
    setTouched(true);
    setValue(maxValue);
  };

  const handleMinClick = () => {
    setError("");
    onError("");
    const minValue = maxDecimals(
      satoshiToBtc(minStakingAmountSat),
      8,
    ).toString();
    setTouched(true);

    setValue(minValue);
  };

  return (
    <div
      className={`flex items-center gap-3 w-full pb-2 border-b  ${!!error ? "border-b-es-error" : "border-b-es-border"}`}
    >
      <div className="w-10 flex items-center">
        <Image
          src={bitcoinWhite}
          className="opacity-70"
          style={{ width: "24px" }}
          alt="bitcoin-white"
        />
      </div>
      <label className="form-control w-full flex-1">
        <input
          type="string"
          className={`w-full bg-transparent text-center text-5xl font-bold ${error && "input-error"}`}
          value={value}
          onChange={handleChange}
          placeholder={coinName}
        />
      </label>
      <div className="flex flex-col w-12">
        <button
          className={`bg-none font-medium text-xs uppercase py-1 px-2 border border-es-border border-b-0  md:hover:opacity-70 md:transition-opacity ${isMaxActive ? "text-es-accent" : "text-es-text-secondary"}`}
          onClick={handleMaxClick}
        >
          max
        </button>
        <button
          className={`bg-none font-medium text-xs uppercase py-1 px-2 border border-es-border  md:hover:opacity-70 md:transition-opacity ${isMinActive ? "text-es-accent" : "text-es-text-secondary"}`}
          onClick={handleMinClick}
        >
          min
        </button>
      </div>
    </div>
  );
};
