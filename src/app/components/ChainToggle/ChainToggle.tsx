import { useEffect, useRef, useState } from "react";
import Select from "react-select";

export const ChainToggle: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const CHAINS = ["Mainnet", "Signet", "Testnet"];
  const [selectedValue, setSelectedValue] = useState<{
    label: string;
    value: string;
  }>({ label: CHAINS[0], value: CHAINS[0] });
  const initialLoad = useRef(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const chain = params.get("chain");
    if (chain && CHAINS.includes(chain)) {
      setSelectedValue({ label: chain, value: chain });
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      if (initialLoad.current) {
        initialLoad.current = false;
      } else {
        const params = new URLSearchParams(window.location.search);
        if (selectedValue.value === "Mainnet") {
          params.delete("chain");
        } else {
          params.set("chain", selectedValue.value);
        }
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.pushState({}, "", newUrl);
        window.location.reload();
      }
    }
  }, [selectedValue, mounted]);

  const handleChange = (
    selectedOption: { label: string; value: string } | null,
  ) => {
    if (selectedOption && selectedOption.value !== selectedValue.value) {
      setSelectedValue(selectedOption);
    }
  };

  if (!mounted) {
    return null;
  }

  const options = CHAINS.map((chain) => ({ label: chain, value: chain }));

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
