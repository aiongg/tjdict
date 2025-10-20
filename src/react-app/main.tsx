import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import App from "./App.tsx";
import { AuthProvider } from "./contexts/AuthContext.tsx";
import { ImageViewerProvider } from "./contexts/ImageViewerContext.tsx";
import { queryClient } from "./lib/queryClient";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<BrowserRouter>
				<AuthProvider>
					<ImageViewerProvider>
						<App />
					</ImageViewerProvider>
				</AuthProvider>
			</BrowserRouter>
			{import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
		</QueryClientProvider>
	</StrictMode>,
);
