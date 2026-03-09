import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Atom, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Unsubscribe() {
  const [location] = useLocation();
  const token = new URLSearchParams(window.location.search).get("token") ?? "";
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  const unsubMut = trpc.email.unsubscribe.useMutation({
    onSuccess: (data) => setStatus(data.success ? "success" : "error"),
    onError: () => setStatus("error"),
  });

  useEffect(() => {
    if (token) {
      unsubMut.mutate({ token });
    } else {
      setStatus("error");
    }
  }, [token]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-12">
        <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
          <Atom className="w-4 h-4 text-primary" />
        </div>
        <span className="font-bold text-foreground">Quantum Daily</span>
      </div>

      <div className="max-w-md w-full text-center">
        {status === "loading" && (
          <div className="space-y-4">
            <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
            <p className="text-muted-foreground">Processing your request...</p>
            <p className="text-sm text-muted-foreground">正在处理取消订阅请求...</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4">
            <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">Unsubscribed</h1>
            <p className="text-muted-foreground">
              You've been successfully unsubscribed from Quantum Daily email reports.
            </p>
            <p className="text-sm text-muted-foreground">
              您已成功取消订阅量子科技每日情报邮件。
            </p>
            <div className="pt-4 space-y-2">
              <p className="text-xs text-muted-foreground">
                Changed your mind? You can re-subscribe anytime on the homepage.
              </p>
              <Link href="/">
                <Button variant="outline" size="sm" className="gap-1.5 border-border/50">
                  Back to Homepage
                </Button>
              </Link>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <XCircle className="w-14 h-14 text-red-400 mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">Invalid Link</h1>
            <p className="text-muted-foreground">
              This unsubscribe link is invalid or has already been used.
            </p>
            <p className="text-sm text-muted-foreground">
              此取消订阅链接无效或已被使用。
            </p>
            <Link href="/">
              <Button variant="outline" size="sm" className="gap-1.5 border-border/50 mt-4">
                Back to Homepage
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
