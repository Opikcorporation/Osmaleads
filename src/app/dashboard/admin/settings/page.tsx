'use client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MetaSettings } from './_components/meta-settings';
import { FaFacebook } from 'react-icons/fa';

// You can dynamically import other icons if you add more integrations
// import { FaGoogle } from 'react-icons/fa';

export default function SettingsPage() {
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold md:text-3xl">Paramètres</h1>
      </div>
      <p className="text-muted-foreground">
        Gérez les intégrations et les connexions aux services externes.
      </p>

      <Tabs defaultValue="meta" className="mt-6">
        <TabsList>
          <TabsTrigger value="meta">
            <svg
              className="mr-2 h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12c0 4.99 3.66 9.13 8.44 9.88v-7.01H7.89V12h2.55V9.78c0-2.54 1.5-3.95 3.82-3.95 1.1 0 2.24.2 2.24.2v2.45h-1.22c-1.27 0-1.68.76-1.68 1.63V12h2.77l-.44 2.87h-2.33v7.01c4.78-.75 8.44-4.89 8.44-9.88C22 6.48 17.52 2 12 2z" />
            </svg>
            Meta
          </TabsTrigger>
          {/* <TabsTrigger value="google" disabled>
            <FaGoogle className="mr-2" /> Google
          </TabsTrigger> */}
        </TabsList>
        <TabsContent value="meta">
          <MetaSettings />
        </TabsContent>
        {/* <TabsContent value="google">
          <div>Configure Google integration here.</div>
        </TabsContent> */}
      </Tabs>
    </>
  );
}
