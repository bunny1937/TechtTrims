// pages/_app.js
import "leaflet/dist/leaflet.css";
import "../styles/globals.css";
import NetworkStatus from "../components/NetworkStatus";

function MyApp({ Component, pageProps }) {
  return (
    <>
      <NetworkStatus />

      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
