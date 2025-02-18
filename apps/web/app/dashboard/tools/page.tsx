import QRCodeGenerator from "@/components/tools/qrcode-generator";

export default function Page() {
	return (
		<div className="flex flex-col px-4 pt-4 h-screen">
			<header>
				<p className="text-2xl font-bold">Tools</p>
			</header>
			<div className="flex flex-col mt-6">
				<QRCodeGenerator />
			</div>
		</div>
	);
}
