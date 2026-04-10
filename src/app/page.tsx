import dynamic from "next/dynamic";

const MatchTable = dynamic(() => import("./MatchTable"), { ssr: false });

export default function Page() {
  return <MatchTable />;
}
