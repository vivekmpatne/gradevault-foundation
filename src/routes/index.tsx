import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GraduationCap, LogIn, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DEMO_ACCOUNT, findStudent, getSession, saveSession } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GradeVault — Login" },
      { name: "description", content: "Sign in to GradeVault to track your academic progress." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [usn, setUsn] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (getSession()) navigate({ to: "/dashboard" });
  }, [navigate]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const student = findStudent(name, usn);
    if (!student) {
      setError("Student not found. Try Demo Account.");
      return;
    }
    saveSession(student);
    navigate({ to: "/dashboard" });
  };

  const handleDemo = () => {
    saveSession(DEMO_ACCOUNT);
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="size-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg mb-4">
            <GraduationCap className="size-7" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">GradeVault</h1>
          <p className="text-sm text-muted-foreground mt-1">Your academic command center</p>
        </div>

        <Card className="border-border/60 shadow-xl">
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>Sign in with your student credentials</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Student Name</Label>
                <Input
                  id="name"
                  placeholder="Vivek Patne"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="usn">USN</Label>
                <Input
                  id="usn"
                  placeholder="1RN24CD112"
                  value={usn}
                  onChange={(e) => setUsn(e.target.value)}
                  required
                  className="uppercase"
                />
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" size="lg">
                <LogIn className="size-4" />
                Login
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                size="lg"
                onClick={handleDemo}
              >
                <Sparkles className="size-4" />
                Demo Account
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-xs text-center text-muted-foreground mt-6">
          Try <span className="font-medium text-foreground">Demo Student / 1RN24CS001</span>
        </p>
      </div>
    </div>
  );
}
