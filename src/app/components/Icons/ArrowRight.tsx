import React from "react";

interface ArrowRightProps {
  width?: number;
  height?: number;
  stroke?: string;
}

export const ArrowRight: React.FC<ArrowRightProps> = ({
  width = 21,
  height = 14,
  stroke = "#B2B2B2",
}) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 21 14"
      className="arrow-icon"
      xmlns="http://www.w3.org/2000/svg"
      stroke={stroke}
    >
      <path d="M20.3828 7L0.000488281 7" strokeWidth="1.6"></path>
      <path
        d="M14.8237 13C15.4414 10.6842 17.5414 7.31579 21.0002 7.31579"
        strokeWidth="1.6"
      ></path>
      <path
        d="M14.8237 0.999878C15.4414 3.31567 17.5414 6.68409 21.0002 6.68409"
        strokeWidth="1.6"
      ></path>
    </svg>
  );
};
