import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Reports from "./pages/Reports";
import ReportDetail from "./pages/ReportDetail";
import Admin from "./pages/Admin";
import Unsubscribe from "./pages/Unsubscribe";
import Search from "./pages/Search";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/reports" component={Reports} />
      <Route path="/reports/:id" component={ReportDetail} />
      <Route path="/admin" component={Admin} />
      <Route path="/unsubscribe" component={Unsubscribe} />
      <Route path="/search" component={Search} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster theme="dark" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
