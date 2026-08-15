import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/App.tsx");import __vite__cjsImport0_react_jsxDevRuntime from "/@fs/C:/Users/pc/Desktop/motosos (1)/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=72a03ac7"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
var _s = $RefreshSig$();
import __vite__cjsImport1_react from "/@fs/C:/Users/pc/Desktop/motosos (1)/node_modules/.vite/deps/react.js?v=72a03ac7"; const useState = __vite__cjsImport1_react["useState"];
import AuthModal from "/src/components/AuthModal.tsx";
import { Toaster } from "/src/components/ui/sonner.tsx";
import { TooltipProvider } from "/src/components/ui/tooltip.tsx";
import NotFound from "/src/pages/NotFound.tsx";
import { Route, Switch } from "/@fs/C:/Users/pc/Desktop/motosos (1)/node_modules/.vite/deps/wouter.js?v=72a03ac7";
import ErrorBoundary from "/src/components/ErrorBoundary.tsx";
import { ThemeProvider } from "/src/contexts/ThemeContext.tsx";
import Home from "/src/pages/Home.tsx";
import MapPage from "/src/pages/MapPage.tsx";
import SOSPage from "/src/pages/SOSPage.tsx";
import CommunityPage from "/src/pages/CommunityPage.tsx";
import ProfilePage from "/src/pages/ProfilePage.tsx";
import MarketplacePage from "/src/pages/MarketplacePage.tsx";
import EventsPage from "/src/pages/EventsPage.tsx";
import BottomNav from "/src/components/BottomNav.tsx";
function AppLayout({ children, onAuthOpen }) {
  return /* @__PURE__ */ jsxDEV("div", { "data-loc": "client\\src\\App.tsx:20", className: "min-h-screen bg-asphalt flex flex-col", children: [
    /* @__PURE__ */ jsxDEV("div", { "data-loc": "client\\src\\App.tsx:21", className: "flex-1 pb-20", children }, void 0, false, {
      fileName: "C:/Users/pc/Desktop/motosos (1)/client/src/App.tsx",
      lineNumber: 21,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(BottomNav, { "data-loc": "client\\src\\App.tsx:22", onAuthOpen }, void 0, false, {
      fileName: "C:/Users/pc/Desktop/motosos (1)/client/src/App.tsx",
      lineNumber: 22,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "C:/Users/pc/Desktop/motosos (1)/client/src/App.tsx",
    lineNumber: 20,
    columnNumber: 5
  }, this);
}
_c = AppLayout;
function Router({ onAuthOpen }) {
  return /* @__PURE__ */ jsxDEV(Switch, { "data-loc": "client\\src\\App.tsx:29", children: [
    /* @__PURE__ */ jsxDEV(Route, { "data-loc": "client\\src\\App.tsx:30", path: "/", children: /* @__PURE__ */ jsxDEV(AppLayout, { "data-loc": "client\\src\\App.tsx:31", onAuthOpen, children: /* @__PURE__ */ jsxDEV(Home, { "data-loc": "client\\src\\App.tsx:32" }, void 0, false, {
      fileName: "C:/Users/pc/Desktop/motosos (1)/client/src/App.tsx",
      lineNumber: 32,
      columnNumber: 11
    }, this) }, void 0, false, {
      fileName: "C:/Users/pc/Desktop/motosos (1)/client/src/App.tsx",
      lineNumber: 31,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "C:/Users/pc/Desktop/motosos (1)/client/src/App.tsx",
      lineNumber: 30,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { "data-loc": "client\\src\\App.tsx:35", path: "/harita", children: /* @__PURE__ */ jsxDEV(AppLayout, { "data-loc": "client\\src\\App.tsx:36", onAuthOpen, children: /* @__PURE__ */ jsxDEV(MapPage, { "data-loc": "client\\src\\App.tsx:37" }, void 0, false, {
      fileName: "C:/Users/pc/Desktop/motosos (1)/client/src/App.tsx",
      lineNumber: 37,
      columnNumber: 11
    }, this) }, void 0, false, {
      fileName: "C:/Users/pc/Desktop/motosos (1)/client/src/App.tsx",
      lineNumber: 36,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "C:/Users/pc/Desktop/motosos (1)/client/src/App.tsx",
      lineNumber: 35,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { "data-loc": "client\\src\\App.tsx:40", path: "/sos", children: /* @__PURE__ */ jsxDEV(AppLayout, { "data-loc": "client\\src\\App.tsx:41", onAuthOpen, children: /* @__PURE__ */ jsxDEV(SOSPage, { "data-loc": "client\\src\\App.tsx:42" }, void 0, false, {
      fileName: "C:/Users/pc/Desktop/motosos (1)/client/src/App.tsx",
      lineNumber: 42,
      columnNumber: 11
    }, this) }, void 0, false, {
      fileName: "C:/Users/pc/Desktop/motosos (1)/client/src/App.tsx",
      lineNumber: 41,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "C:/Users/pc/Desktop/motosos (1)/client/src/App.tsx",
      lineNumber: 40,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { "data-loc": "client\\src\\App.tsx:45", path: "/topluluk", children: /* @__PURE__ */ jsxDEV(AppLayout, { "data-loc": "client\\src\\App.tsx:46", onAuthOpen, children: /* @__PURE__ */ jsxDEV(CommunityPage, { "data-loc": "client\\src\\App.tsx:47" }, void 0, false, {
      fileName: "C:/Users/pc/Desktop/motosos (1)/client/src/App.tsx",
      lineNumber: 47,
      columnNumber: 11
    }, this) }, void 0, false, {
      fileName: "C:/Users/pc/Desktop/motosos (1)/client/src/App.tsx",
      lineNumber: 46,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "C:/Users/pc/Desktop/motosos (1)/client/src/App.tsx",
      lineNumber: 45,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { "data-loc": "client\\src\\App.tsx:50", path: "/profil", children: /* @__PURE__ */ jsxDEV(AppLayout, { "data-loc": "client\\src\\App.tsx:51", onAuthOpen, children: /* @__PURE__ */ jsxDEV(ProfilePage, { "data-loc": "client\\src\\App.tsx:52" }, void 0, false, {
      fileName: "C:/Users/pc/Desktop/motosos (1)/client/src/App.tsx",
      lineNumber: 52,
      columnNumber: 11
    }, this) }, void 0, false, {
      fileName: "C:/Users/pc/Desktop/motosos (1)/client/src/App.tsx",
      lineNumber: 51,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "C:/Users/pc/Desktop/motosos (1)/client/src/App.tsx",
      lineNumber: 50,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { "data-loc": "client\\src\\App.tsx:55", path: "/ikinci-el", children: /* @__PURE__ */ jsxDEV(AppLayout, { "data-loc": "client\\src\\App.tsx:56", onAuthOpen, children: /* @__PURE__ */ jsxDEV(MarketplacePage, { "data-loc": "client\\src\\App.tsx:57" }, void 0, false, {
      fileName: "C:/Users/pc/Desktop/motosos (1)/client/src/App.tsx",
      lineNumber: 57,
      columnNumber: 11
    }, this) }, void 0, false, {
      fileName: "C:/Users/pc/Desktop/motosos (1)/client/src/App.tsx",
      lineNumber: 56,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "C:/Users/pc/Desktop/motosos (1)/client/src/App.tsx",
      lineNumber: 55,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { "data-loc": "client\\src\\App.tsx:60", path: "/etkinlikler", children: /* @__PURE__ */ jsxDEV(AppLayout, { "data-loc": "client\\src\\App.tsx:61", onAuthOpen, children: /* @__PURE__ */ jsxDEV(EventsPage, { "data-loc": "client\\src\\App.tsx:62" }, void 0, false, {
      fileName: "C:/Users/pc/Desktop/motosos (1)/client/src/App.tsx",
      lineNumber: 62,
      columnNumber: 11
    }, this) }, void 0, false, {
      fileName: "C:/Users/pc/Desktop/motosos (1)/client/src/App.tsx",
      lineNumber: 61,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "C:/Users/pc/Desktop/motosos (1)/client/src/App.tsx",
      lineNumber: 60,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { "data-loc": "client\\src\\App.tsx:65", path: "/404", component: NotFound }, void 0, false, {
      fileName: "C:/Users/pc/Desktop/motosos (1)/client/src/App.tsx",
      lineNumber: 65,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Route, { "data-loc": "client\\src\\App.tsx:66", component: NotFound }, void 0, false, {
      fileName: "C:/Users/pc/Desktop/motosos (1)/client/src/App.tsx",
      lineNumber: 66,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "C:/Users/pc/Desktop/motosos (1)/client/src/App.tsx",
    lineNumber: 29,
    columnNumber: 5
  }, this);
}
_c2 = Router;
function App() {
  _s();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  return /* @__PURE__ */ jsxDEV(ErrorBoundary, { "data-loc": "client\\src\\App.tsx:75", children: /* @__PURE__ */ jsxDEV(ThemeProvider, { "data-loc": "client\\src\\App.tsx:76", defaultTheme: "dark", children: /* @__PURE__ */ jsxDEV(TooltipProvider, { "data-loc": "client\\src\\App.tsx:77", children: [
    /* @__PURE__ */ jsxDEV(Toaster, { "data-loc": "client\\src\\App.tsx:78" }, void 0, false, {
      fileName: "C:/Users/pc/Desktop/motosos (1)/client/src/App.tsx",
      lineNumber: 78,
      columnNumber: 11
    }, this),
    /* @__PURE__ */ jsxDEV(Router, { "data-loc": "client\\src\\App.tsx:79", onAuthOpen: () => setIsAuthOpen(true) }, void 0, false, {
      fileName: "C:/Users/pc/Desktop/motosos (1)/client/src/App.tsx",
      lineNumber: 79,
      columnNumber: 11
    }, this),
    /* @__PURE__ */ jsxDEV(AuthModal, { "data-loc": "client\\src\\App.tsx:80", isOpen: isAuthOpen, onClose: () => setIsAuthOpen(false) }, void 0, false, {
      fileName: "C:/Users/pc/Desktop/motosos (1)/client/src/App.tsx",
      lineNumber: 80,
      columnNumber: 11
    }, this)
  ] }, void 0, true, {
    fileName: "C:/Users/pc/Desktop/motosos (1)/client/src/App.tsx",
    lineNumber: 77,
    columnNumber: 9
  }, this) }, void 0, false, {
    fileName: "C:/Users/pc/Desktop/motosos (1)/client/src/App.tsx",
    lineNumber: 76,
    columnNumber: 7
  }, this) }, void 0, false, {
    fileName: "C:/Users/pc/Desktop/motosos (1)/client/src/App.tsx",
    lineNumber: 75,
    columnNumber: 5
  }, this);
}
_s(App, "xASa6VDVkMMtxCo5XwieAxfmhBs=");
_c3 = App;
export default App;
var _c, _c2, _c3;
$RefreshReg$(_c, "AppLayout");
$RefreshReg$(_c2, "Router");
$RefreshReg$(_c3, "App");
import * as RefreshRuntime from "/@react-refresh";
const inWebWorker = typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;
if (import.meta.hot && !inWebWorker) {
  if (!window.$RefreshReg$) {
    throw new Error(
      "@vitejs/plugin-react can't detect preamble. Something is wrong."
    );
  }
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("C:/Users/pc/Desktop/motosos (1)/client/src/App.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("C:/Users/pc/Desktop/motosos (1)/client/src/App.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}
function $RefreshReg$(type, id) {
  return RefreshRuntime.register(type, "C:/Users/pc/Desktop/motosos (1)/client/src/App.tsx " + id);
}
function $RefreshSig$() {
  return RefreshRuntime.createSignatureFunctionForTransform();
}

//# sourceMappingURL=data:application/json;base64,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QUFBQTtBQUFBLFNBc0NBO0FBRUo7QUFBQ2tCLE1BMUNRRDtBQTRDVCxTQUFTRSxNQUFNO0FBQUFDLEtBQUE7QUFDYixRQUFNLENBQUNDLFlBQVlDLGFBQWEsSUFBSTFCLFNBQVMsS0FBSztBQUVsRCxTQUNFLHVCQUFDLHdEQUNDLGlDQUFDLHdEQUFjLGNBQWEsUUFDMUIsaUNBQUMsMERBQ0M7QUFBQSwyQkFBQyxvREFBRDtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQVE7QUFBQSxJQUNSLHVCQUFDLGlEQUFPLFlBQVksTUFBTTBCLGNBQWMsSUFBSSxLQUE1QztBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQThDO0FBQUEsSUFDOUMsdUJBQUMsb0RBQVUsUUFBUUQsWUFBWSxTQUFTLE1BQU1DLGNBQWMsS0FBSyxLQUFqRTtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQW1FO0FBQUEsT0FIckU7QUFBQTtBQUFBO0FBQUE7QUFBQSxTQUlBLEtBTEY7QUFBQTtBQUFBO0FBQUE7QUFBQSxTQU1BLEtBUEY7QUFBQTtBQUFBO0FBQUE7QUFBQSxTQVFBO0FBRUo7QUFBQ0YsR0FkUUQsS0FBRztBQUFBLE1BQUhBO0FBZ0JULGVBQWVBO0FBQUksSUFBQUgsSUFBQUUsS0FBQUs7QUFBQSxhQUFBUCxJQUFBO0FBQUEsYUFBQUUsS0FBQTtBQUFBLGFBQUFLLEtBQUEiLCJuYW1lcyI6WyJ1c2VTdGF0ZSIsIkF1dGhNb2RhbCIsIlRvYXN0ZXIiLCJUb29sdGlwUHJvdmlkZXIiLCJOb3RGb3VuZCIsIlJvdXRlIiwiU3dpdGNoIiwiRXJyb3JCb3VuZGFyeSIsIlRoZW1lUHJvdmlkZXIiLCJIb21lIiwiTWFwUGFnZSIsIlNPU1BhZ2UiLCJDb21tdW5pdHlQYWdlIiwiUHJvZmlsZVBhZ2UiLCJNYXJrZXRwbGFjZVBhZ2UiLCJFdmVudHNQYWdlIiwiQm90dG9tTmF2IiwiQXBwTGF5b3V0IiwiY2hpbGRyZW4iLCJvbkF1dGhPcGVuIiwiX2MiLCJSb3V0ZXIiLCJfYzIiLCJBcHAiLCJfcyIsImlzQXV0aE9wZW4iLCJzZXRJc0F1dGhPcGVuIiwiX2MzIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VzIjpbIkFwcC50c3giXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFJlYWN0LCB7IHVzZVN0YXRlIH0gZnJvbSAncmVhY3QnO1xuaW1wb3J0IEF1dGhNb2RhbCBmcm9tICcuL2NvbXBvbmVudHMvQXV0aE1vZGFsJztcbmltcG9ydCB7IFRvYXN0ZXIgfSBmcm9tIFwiQC9jb21wb25lbnRzL3VpL3Nvbm5lclwiO1xuaW1wb3J0IHsgVG9vbHRpcFByb3ZpZGVyIH0gZnJvbSBcIkAvY29tcG9uZW50cy91aS90b29sdGlwXCI7XG5pbXBvcnQgTm90Rm91bmQgZnJvbSBcIkAvcGFnZXMvTm90Rm91bmRcIjtcbmltcG9ydCB7IFJvdXRlLCBTd2l0Y2ggfSBmcm9tIFwid291dGVyXCI7XG5pbXBvcnQgRXJyb3JCb3VuZGFyeSBmcm9tIFwiLi9jb21wb25lbnRzL0Vycm9yQm91bmRhcnlcIjtcbmltcG9ydCB7IFRoZW1lUHJvdmlkZXIgfSBmcm9tIFwiLi9jb250ZXh0cy9UaGVtZUNvbnRleHRcIjtcbmltcG9ydCBIb21lIGZyb20gXCIuL3BhZ2VzL0hvbWVcIjtcbmltcG9ydCBNYXBQYWdlIGZyb20gXCIuL3BhZ2VzL01hcFBhZ2VcIjtcbmltcG9ydCBTT1NQYWdlIGZyb20gXCIuL3BhZ2VzL1NPU1BhZ2VcIjtcbmltcG9ydCBDb21tdW5pdHlQYWdlIGZyb20gXCIuL3BhZ2VzL0NvbW11bml0eVBhZ2VcIjtcbmltcG9ydCBQcm9maWxlUGFnZSBmcm9tIFwiLi9wYWdlcy9Qcm9maWxlUGFnZVwiO1xuaW1wb3J0IE1hcmtldHBsYWNlUGFnZSBmcm9tIFwiLi9wYWdlcy9NYXJrZXRwbGFjZVBhZ2VcIjtcbmltcG9ydCBFdmVudHNQYWdlIGZyb20gXCIuL3BhZ2VzL0V2ZW50c1BhZ2VcIjtcbmltcG9ydCBCb3R0b21OYXYgZnJvbSBcIi4vY29tcG9uZW50cy9Cb3R0b21OYXZcIjtcblxuZnVuY3Rpb24gQXBwTGF5b3V0KHsgY2hpbGRyZW4sIG9uQXV0aE9wZW4gfTogeyBjaGlsZHJlbjogUmVhY3QuUmVhY3ROb2RlOyBvbkF1dGhPcGVuPzogKCkgPT4gdm9pZCB9KSB7XG4gIHJldHVybiAoXG4gICAgPGRpdiBjbGFzc05hbWU9XCJtaW4taC1zY3JlZW4gYmctYXNwaGFsdCBmbGV4IGZsZXgtY29sXCI+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgtMSBwYi0yMFwiPntjaGlsZHJlbn08L2Rpdj5cbiAgICAgIDxCb3R0b21OYXYgb25BdXRoT3Blbj17b25BdXRoT3Blbn0gLz5cbiAgICA8L2Rpdj5cbiAgKTtcbn1cblxuZnVuY3Rpb24gUm91dGVyKHsgb25BdXRoT3BlbiB9OiB7IG9uQXV0aE9wZW4/OiAoKSA9PiB2b2lkIH0pIHtcbiAgcmV0dXJuIChcbiAgICA8U3dpdGNoPlxuICAgICAgPFJvdXRlIHBhdGg9XCIvXCI+XG4gICAgICAgIDxBcHBMYXlvdXQgb25BdXRoT3Blbj17b25BdXRoT3Blbn0+XG4gICAgICAgICAgPEhvbWUgLz5cbiAgICAgICAgPC9BcHBMYXlvdXQ+XG4gICAgICA8L1JvdXRlPlxuICAgICAgPFJvdXRlIHBhdGg9XCIvaGFyaXRhXCI+XG4gICAgICAgIDxBcHBMYXlvdXQgb25BdXRoT3Blbj17b25BdXRoT3Blbn0+XG4gICAgICAgICAgPE1hcFBhZ2UgLz5cbiAgICAgICAgPC9BcHBMYXlvdXQ+XG4gICAgICA8L1JvdXRlPlxuICAgICAgPFJvdXRlIHBhdGg9XCIvc29zXCI+XG4gICAgICAgIDxBcHBMYXlvdXQgb25BdXRoT3Blbj17b25BdXRoT3Blbn0+XG4gICAgICAgICAgPFNPU1BhZ2UgLz5cbiAgICAgICAgPC9BcHBMYXlvdXQ+XG4gICAgICA8L1JvdXRlPlxuICAgICAgPFJvdXRlIHBhdGg9XCIvdG9wbHVsdWtcIj5cbiAgICAgICAgPEFwcExheW91dCBvbkF1dGhPcGVuPXtvbkF1dGhPcGVufT5cbiAgICAgICAgICA8Q29tbXVuaXR5UGFnZSAvPlxuICAgICAgICA8L0FwcExheW91dD5cbiAgICAgIDwvUm91dGU+XG4gICAgICA8Um91dGUgcGF0aD1cIi9wcm9maWxcIj5cbiAgICAgICAgPEFwcExheW91dCBvbkF1dGhPcGVuPXtvbkF1dGhPcGVufT5cbiAgICAgICAgICA8UHJvZmlsZVBhZ2UgLz5cbiAgICAgICAgPC9BcHBMYXlvdXQ+XG4gICAgICA8L1JvdXRlPlxuICAgICAgPFJvdXRlIHBhdGg9XCIvaWtpbmNpLWVsXCI+XG4gICAgICAgIDxBcHBMYXlvdXQgb25BdXRoT3Blbj17b25BdXRoT3Blbn0+XG4gICAgICAgICAgPE1hcmtldHBsYWNlUGFnZSAvPlxuICAgICAgICA8L0FwcExheW91dD5cbiAgICAgIDwvUm91dGU+XG4gICAgICA8Um91dGUgcGF0aD1cIi9ldGtpbmxpa2xlclwiPlxuICAgICAgICA8QXBwTGF5b3V0IG9uQXV0aE9wZW49e29uQXV0aE9wZW59PlxuICAgICAgICAgIDxFdmVudHNQYWdlIC8+XG4gICAgICAgIDwvQXBwTGF5b3V0PlxuICAgICAgPC9Sb3V0ZT5cbiAgICAgIDxSb3V0ZSBwYXRoPVwiLzQwNFwiIGNvbXBvbmVudD17Tm90Rm91bmR9IC8+XG4gICAgICA8Um91dGUgY29tcG9uZW50PXtOb3RGb3VuZH0gLz5cbiAgICA8L1N3aXRjaD5cbiAgKTtcbn1cblxuZnVuY3Rpb24gQXBwKCkge1xuICBjb25zdCBbaXNBdXRoT3Blbiwgc2V0SXNBdXRoT3Blbl0gPSB1c2VTdGF0ZShmYWxzZSk7XG5cbiAgcmV0dXJuIChcbiAgICA8RXJyb3JCb3VuZGFyeT5cbiAgICAgIDxUaGVtZVByb3ZpZGVyIGRlZmF1bHRUaGVtZT1cImRhcmtcIj5cbiAgICAgICAgPFRvb2x0aXBQcm92aWRlcj5cbiAgICAgICAgICA8VG9hc3RlciAvPlxuICAgICAgICAgIDxSb3V0ZXIgb25BdXRoT3Blbj17KCkgPT4gc2V0SXNBdXRoT3Blbih0cnVlKX0gLz5cbiAgICAgICAgICA8QXV0aE1vZGFsIGlzT3Blbj17aXNBdXRoT3Blbn0gb25DbG9zZT17KCkgPT4gc2V0SXNBdXRoT3BlbihmYWxzZSl9IC8+XG4gICAgICAgIDwvVG9vbHRpcFByb3ZpZGVyPlxuICAgICAgPC9UaGVtZVByb3ZpZGVyPlxuICAgIDwvRXJyb3JCb3VuZGFyeT5cbiAgKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgQXBwOyJdLCJmaWxlIjoiQzovVXNlcnMvcGMvRGVza3RvcC9tb3Rvc29zICgxKS9jbGllbnQvc3JjL0FwcC50c3gifQ==