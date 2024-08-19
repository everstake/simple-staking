import { IoMdClose } from "react-icons/io";

interface MessageProps {
  title: string;
  messages: string[];
  icon: any;
  onClose: (value: boolean) => void;
}

// Used for
// - Staking cap reached
// - Staking has not started yet
// - Staking params are upgrading
export const Message: React.FC<MessageProps> = ({
  title,
  messages,
  icon,
  onClose,
}) => {
  return (
    <div className="flex flex-col items-center justify-center gap-2 flex-grow">
      <div className="absolute right-4 top-4">
        <button
          className="btn btn-circle btn-ghost btn-sm"
          onClick={() => onClose(false)}
        >
          <IoMdClose size={24} />
        </button>
      </div>
      <div className="flex flex-col justify-content items-center gap-2  p-4 pt-0 flex-grow">
        <h3 className="text-center font-semibold text-xl uppercase">{title}</h3>
        <div className="flex flex-col items-center justify-center pt-3">
          {messages.map((message) => (
            <p key={message} className="px-9 text-es-accent font-medium mb-3">
              {message}
            </p>
          ))}
        </div>
      </div>
      <div className="-mx-4 w-full mt-auto flex-shrink">
        <button
          className="es-button"
          onClick={() => {
            onClose(false);
          }}
        >
          CLOSE
        </button>
      </div>
    </div>
  );
};
