import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Bot } from "lucide-react";

export default function AdminSettingsPage() {
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold md:text-3xl">Lead Distribution Settings</h1>
        <Button>Save Changes</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribution Rules</CardTitle>
            <CardDescription>
              Set up how new leads are automatically assigned to your teams.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="auto-distribute" className="text-base">
                  Enable Automated Distribution
                </Label>
                <p className="text-sm text-muted-foreground">
                  Automatically distribute new leads based on the rules below.
                </p>
              </div>
              <Switch id="auto-distribute" defaultChecked />
            </div>

            <div className="space-y-2">
              <Label htmlFor="distribution-logic">Distribution Logic</Label>
              <Select defaultValue="round-robin">
                <SelectTrigger id="distribution-logic">
                  <SelectValue placeholder="Select logic" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="round-robin">Round Robin</SelectItem>
                  <SelectItem value="load-balanced">Load Balanced (fewest leads)</SelectItem>
                  <SelectItem value="random">Random</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
                <Label>Distribution Schedule</Label>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="start-time" className="text-sm font-normal">Start Time</Label>
                        <Input id="start-time" type="time" defaultValue="09:00" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="end-time" className="text-sm font-normal">End Time</Label>
                        <Input id="end-time" type="time" defaultValue="17:00" />
                    </div>
                </div>
                <p className="text-xs text-muted-foreground">Leads will only be distributed between these times.</p>
            </div>
            
             <div className="space-y-2">
                <Label htmlFor="quota">Leads per person per day</Label>
                <Input id="quota" type="number" defaultValue="10" placeholder="e.g., 10" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="text-accent" /> AI Strategy
            </CardTitle>
            <CardDescription>
              Use AI to suggest the best distribution strategy for unassigned leads.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
                Our AI can analyze unassigned leads and your team's performance to suggest the optimal collaborator for each lead, maximizing your conversion potential.
            </p>
            <Button className="w-full bg-accent hover:bg-accent/90">
              <Bot className="mr-2 h-4 w-4" />
              Suggest & Distribute Now
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              This will run the AI strategy on all currently unassigned leads.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
