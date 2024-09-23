import { Toast } from "@/app/components/Toast/Toast";
import { useError } from "@/app/context/Error/ErrorContext";
import { ErrorState, ShowErrorParams } from "@/app/types/errors";

interface ErrorModalProps {
  open: boolean;
  onClose: () => void;
  onRetry?: () => void;
  errorMessage: string;
  errorState?: ErrorState;
  errorTime: Date;
}

export const ErrorModal: React.FC<ErrorModalProps> = ({
  open,
  onClose,
  errorMessage,
  errorState,
}) => {
  const { error, retryErrorAction } = useError();

  const handleRetry = () => {
    const retryErrorParam: ShowErrorParams = {
      error: {
        message: error.message,
        errorState: error.errorState,
        errorTime: new Date(),
      },
      retryAction: retryErrorAction,
    };

    onClose();

    setTimeout(() => {
      if (retryErrorParam.retryAction) {
        retryErrorParam.retryAction();
      }
    }, 300);
  };

  const getErrorTitle = () => {
    switch (errorState) {
      case ErrorState.SERVER_ERROR:
        return "Server Error";
      case ErrorState.WALLET:
        return "Network Error";
      case ErrorState.WITHDRAW:
        return "Withdraw Error";
      case ErrorState.STAKING:
        return "Stake Error";
      case ErrorState.UNBONDING:
        return "Unbonding Error";
      default:
        return "Unknown Error";
    }
  };

  const getErrorMessage = () => {
    switch (errorState) {
      case ErrorState.SERVER_ERROR:
        return `Error fetching data due to: ${errorMessage}`;
      case ErrorState.UNBONDING:
        return `Your request to unbound failed due to: ${errorMessage}`;
      case ErrorState.WITHDRAW:
        return `Failed to withdraw due to: ${errorMessage}`;
      case ErrorState.STAKING:
        return `Failed to stake due to: ${errorMessage}`;
      case ErrorState.WALLET:
        return `Failed to switch network due to: ${errorMessage}`;
      default:
        return errorMessage;
    }
  };

  return (
    <Toast
      open={open}
      title={getErrorTitle()}
      desc={getErrorMessage()}
      onClose={onClose}
      type="error"
    />
  );
};
