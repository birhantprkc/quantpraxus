import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const consoleBanner = `
%c╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   ██████╗ ███████╗██████╗  █████╗ ████████╗                 ║
║   ██╔══██╗██╔════╝██╔══██╗██╔══██╗╚══██╔══╝                 ║
║   ██████╔╝█████╗  ██████╔╝███████║   ██║                    ║
║   ██╔══██╗██╔══╝  ██╔══██╗██╔══██║   ██║                    ║
║   ██████╔╝███████╗██║  ██║██║  ██║   ██║                    ║
║   ╚═════╝ ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝                    ║
║                                                              ║
║    ██████╗ █████╗ ███╗   ██╗██╗  ██╗██╗██████╗              ║
║   ██╔════╝██╔══██╗████╗  ██║██║ ██╔╝██║██╔══██╗             ║
║   ██║     ███████║██╔██╗ ██║█████╔╝ ██║██████╔╝             ║
║   ██║     ██╔══██║██║╚██╗██║██╔═██╗ ██║██╔══██╗             ║
║   ╚██████╗██║  ██║██║ ╚████║██║  ██╗██║██║  ██║             ║
║    ╚═════╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝╚═╝  ╚═╝             ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`;

const warningMessage = `%c
   ⚠️  UMARIM KÖTÜ ŞEYLER YAPMAYA GELMEDİN :D?  ⚠️
`;

console.log(consoleBanner, 'color: #9333ea; font-weight: bold; font-size: 12px;');
console.log(warningMessage, 'color: #f59e0b; font-weight: bold; font-size: 16px; text-align: center; padding: 10px;');
console.log('%c🔒 Bu konsol geliştiriciler içindir. Bilinmeyen kodları buraya yapıştırmayın!', 'color: #ef4444; font-weight: bold; font-size: 14px;');
console.log('%c📚 YKS\'de başarılar dilerim! ', 'color: #10b981; font-weight: bold; font-size: 13px;');

createRoot(document.getElementById("root")!).render(<App />);
