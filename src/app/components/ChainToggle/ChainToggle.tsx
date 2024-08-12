import { useEffect, useState } from "react";
import Select from "react-select";

export const ChainToggle: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const CHAINS = [
    { name: "mainnet", url: "https://btc-staking.everstake.one" },
    { name: "signet", url: "https://btc-staking-testnet.everstake.one" },
  ];
  const [selectedValue, setSelectedValue] = useState<{
    label: string;
    value: string;
  }>({ label: CHAINS[0].name, value: CHAINS[0].name });

  useEffect(() => {
    const currentChain = process.env.NEXT_PUBLIC_NETWORK;

    const foundChain = CHAINS.find((chain) => chain.name === currentChain);

    if (foundChain) {
      setSelectedValue({ label: foundChain.name, value: foundChain.name });
    }
    setMounted(true);
  }, []);

  const handleChange = (
    selectedOption: { label: string; value: string } | null,
  ) => {
    if (selectedOption && selectedOption.value !== selectedValue.value) {
      setSelectedValue(selectedOption);
      const selectedChain = CHAINS.find(
        (chain) => chain.name === selectedOption.value,
      );
      if (selectedChain) {
        window.location.href = selectedChain.url;
      }
    }
  };

  if (!mounted) {
    return null;
  }

  const options = CHAINS.map((chain) => ({
    label: chain.name,
    value: chain.name,
  }));

  return (
    <Select
      value={selectedValue}
      onChange={handleChange}
      options={options}
      unstyled
      isSearchable={false}
      classNames={{
        control: (state) =>
          "border border-es-border bg-transparent px-3 py-2 min-w-[173px] cursor-pointer uppercase text-xs font-bold",
        menu: (state) => "bg-es-bg border-x border-es-border text-xs",
        option: () =>
          "border-b border-es-border p-2 cursor-pointer md:hover:text-es-accent uppercase text-sm	 font-bold",
        singleValue: () => "text-xs",
      }}
    />
  );
};
