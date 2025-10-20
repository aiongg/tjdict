import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
import { AuthProvider } from "./contexts/AuthContext.tsx";
import { ImageViewerProvider } from "./contexts/ImageViewerContext.tsx";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<BrowserRouter>
			<AuthProvider>
				<ImageViewerProvider>
					<App />
				</ImageViewerProvider>
			</AuthProvider>
		</BrowserRouter>
	</StrictMode>,
);
