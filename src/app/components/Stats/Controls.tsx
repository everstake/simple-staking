interface ControlsProps {
  onStaking: () => void;
  onConnect: () => void;
  address: string;
  balancesAreNonZero: boolean;
}

export const Controls: React.FC<ControlsProps> = ({
  onStaking,
  onConnect,
  address,
  balancesAreNonZero,
}) => {
  const buttonText = !address
    ? "CONNECT"
    : balancesAreNonZero
      ? "STAKE MORE"
      : "STAKE";

  const infoText = !address
    ? 'Press "Connect" to connect wallet'
    : balancesAreNonZero
      ? 'Press "Stake more" to increase your staking amount'
      : 'Press "Stake" to start staking';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
      <div className="col-span-1 md:col-span-3 border-l border-b border-es-border flex items-center">
        <p className="text-es-text ml-11 text-md">{infoText}</p>
      </div>

      <div className="col-span-1">
        <button
          className="border-es-accent border font-medium text-3xl text-center h-20 w-full text-es-black bg-es-accent md:hover:bg-es-black md:hover:text-es-accent md:transition-colors disabled:opacity-70"
          onClick={!!address ? onStaking : onConnect}
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
};
