import axios from "axios";

export const apiWrapper = async (
  method: "GET" | "POST",
  url: string,
  generalErrorMessage: string,
  params?: any,
) => {
  let response;
  let handler;
  switch (method) {
    case "GET":
      handler = axios.get;
      break;
    case "POST":
      handler = axios.post;
      break;
    default:
      throw new Error("Invalid method");
  }

  const searchParams = new URLSearchParams(window.location.search);
  const chain = searchParams.get("chain");

  let baseURL;
  switch (chain) {
    case "Signet":
      baseURL = process.env.NEXT_PUBLIC_API_URL_SIGNET;
      break;
    case "Testnet":
      baseURL = process.env.NEXT_PUBLIC_API_URL_TESTNET;
      break;
    case null:
    case "Mainnet":
    default:
      baseURL = process.env.NEXT_PUBLIC_API_URL_MAINNET;
      break;
  }

  const fullURL = `${baseURL}${url}`;

  try {
    response = await handler(
      fullURL,
      method === "POST"
        ? { ...params }
        : {
            params,
          },
    );
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = error?.response?.data?.message;
      throw new Error(message || generalErrorMessage);
    } else {
      throw new Error(generalErrorMessage);
    }
  }
  return response;
};
