import React, { useEffect, useState } from "react";

interface ToastProps {
  open: boolean;
  title: string;
  desc?: string;
  link?: string;
  onClose: (value: boolean) => void;
}

export const Toast: React.FC<ToastProps> = ({
  open,
  title,
  desc,
  link,
  onClose,
}) => {
  const [progress, setProgress] = useState(0);
  const duration = 10000;

  useEffect(() => {
    if (open) {
      setProgress(0);
      const startTime = Date.now();

      const timer = setInterval(() => {
        const elapsedTime = Date.now() - startTime;
        const progress = Math.min((elapsedTime / duration) * 100, 100);
        setProgress(+progress.toFixed(1));

        if (elapsedTime >= duration) {
          clearInterval(timer);
          onClose(false);
        }
      }, 50);

      return () => clearInterval(timer);
    }
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="max-w-[480px] fixed left-10 right-10 top-28 z-10 bg-es-bg p-5 md:left-auto">
      <div className="w-full h-1 bg-es-success-light absolute -top-1 left-0 right-0 overflow-hidden">
        <div
          className="h-full w-0 bg-es-success"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <h2 className="text-xl mb-6 font-medium uppercase">{title}</h2>
      <p className="mb-5 text-base">{desc}</p>
      <div className="flex justify-end">
        {link && (
          <a
            className="text-base font-medium uppercase text-es-text-secondary md:hover:opacity-70 mr-8 md:transition-opacity"
            href={link}
            target="_blank"
          >
            view txhash
          </a>
        )}
        <button
          className="text-base font-medium uppercase text-es-accent md:hover:opacity-70 md:transition-opacity"
          onClick={() => onClose(false)}
        >
          got it
        </button>
      </div>
    </div>
  );
};
