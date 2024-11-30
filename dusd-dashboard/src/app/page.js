import DashboardPage from "../components/dashboard/DashboardPage";
import Head from "next/head";

export default function Home() {
	return (
		<>
			<Head>
				<title>DUSD Monitor</title>
				<meta name="DUSD Monitor" content="Dashboard for DUSD Monitor" />
			</Head>
			<DashboardPage />
		</>
	);
}
