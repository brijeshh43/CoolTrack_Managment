import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Snowflake, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign In — CoolTrack Field Service" },
      {
        name: "description",
        content:
          "Secure sign in for HVAC admins and field engineers to manage maintenance, breakdown and installation jobs.",
      },
      { property: "og:title", content: "Sign In — CoolTrack Field Service" },
      {
        property: "og:description",
        content: "Secure sign in for HVAC admins and field engineers.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void navigate({ to: "/home", replace: true });
    });
  }, [navigate]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    void navigate({ to: "/home", replace: true });
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Full name is required");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName, employee_code: employeeCode, phone },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.session) {
      void navigate({ to: "/home", replace: true });
    } else {
      toast.success("Account created. Check your email to confirm, then sign in.");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <div className="text-center mb-8">
          <div className="mx-auto mb-6 size-16 flex items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-glow">
            <Snowflake className="size-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold">CoolTrack</h1>
          <p className="mt-2 text-base text-muted-foreground">
            HVAC field service — maintenance, breakdown, installation & commissioning.
          </p>
        </div>

        <div className="surface-card p-8 space-y-6">
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-5 pt-6">
              <form onSubmit={signIn} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </div>
                <Button type="submit" size="lg" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="animate-spin" />} Sign In
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-5 pt-6">
              <form onSubmit={signUp} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full name *</Label>
                  <Input
                    id="fullName"
                    required
                    maxLength={80}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="empCode">Employee ID</Label>
                    <Input
                      id="empCode"
                      maxLength={30}
                      value={employeeCode}
                      onChange={(e) => setEmployeeCode(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      maxLength={20}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email2">Email *</Label>
                  <Input
                    id="email2"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password2">Password *</Label>
                  <Input
                    id="password2"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
                <Button type="submit" size="lg" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="animate-spin" />} Create Account
                </Button>
                <p className="text-sm text-muted-foreground text-center">
                  The first account created becomes the Admin. Every later account is registered as
                  a Field Engineer.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
