import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background">
      <div className="w-full max-w-md p-4">
        <Card className="rounded-xl border-2 border-primary/20 shadow-xl">
          <CardHeader className="space-y-4 text-center">
             <div className="inline-block">
              <Logo className="mx-auto h-12 w-12" />
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight text-primary">Create an Account</CardTitle>
            <CardDescription className="text-lg">
              Join LeadFlowAI and start managing your leads.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action="/dashboard" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first-name">First name</Label>
                  <Input id="first-name" placeholder="Lee" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last-name">Last name</Label>
                  <Input id="last-name" placeholder="Robinson" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="lee@example.com" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-picture">Profile Picture</Label>
                <Input id="profile-picture" type="file" required className="file:text-primary file:font-semibold" />
                 <p className="text-xs text-muted-foreground">A profile picture is required.</p>
              </div>
              <Button type="submit" className="w-full text-lg font-semibold">
                Create account
              </Button>
              <div className="mt-4 text-center text-sm">
                Already have an account?{' '}
                <Link href="/" className="underline">
                  Sign in
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
