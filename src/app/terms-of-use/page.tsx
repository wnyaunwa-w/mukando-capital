
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Landmark, Facebook, Twitter, Instagram } from 'lucide-react';

export default function TermsOfUsePage() {
  return (
    <div className="flex flex-col min-h-dvh bg-background text-foreground">
      <header className="px-4 lg:px-6 h-16 flex items-center shadow-sm sticky top-0 bg-background/80 backdrop-blur-sm z-10">
        <Link href="/" className="flex items-center justify-center" prefetch={false}>
          <div className="bg-primary p-1.5 rounded-lg">
            <Landmark className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="ml-3 text-xl font-bold text-primary font-headline">Mukando Capital</span>
        </Link>
        <nav className="ml-auto flex gap-2 sm:gap-4">
           <Button variant="ghost" asChild>
            <Link href="/about">About Us</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/contact">Contact Us</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Get Started</Link>
          </Button>
        </nav>
      </header>
      <main className="flex-1">
        <div className="container px-4 md:px-6 py-12 md:py-24 lg:py-32">
          <div className="prose prose-lg max-w-4xl mx-auto">
            <h1>MUKANDO CAPITAL TERMS OF USE</h1>
            <p className="text-sm text-muted-foreground"><strong>Last Updated:</strong> 26/12/2025</p>

            <h2>1. INTRODUCTION</h2>
            <p>These are the Terms and Conditions ("Terms") for the Mukando Capital Application and Platform ("Software", "Platform", "App") operated by <strong>Mukando Capital</strong> ("Mukando Capital", "Us", "We"), a company duly registered in terms of the laws of Zimbabwe.</p>
            <p><strong>Physical Address:</strong><br />Sub Division H, Binda Estate, Goromonzi, Zimbabwe</p>
            <p>By accessing or using our Platform, you agree to be bound by these Terms. If you do not agree with any part of these Terms, you must not use our services.</p>

            <h2>2. DETAILED DESCRIPTION OF SERVICES</h2>
            <p>Mukando Capital is a fintech service provider that offers information and activity management services allowing you to manage your savings club (Mukando) contributions, consolidate and visualize your group activities, financials, and other related matters ("Service").</p>
            <p>Your contribution funds are linked to financial products or accounts as chosen by your group. When you link your group or open an account via the Mukando Capital platform, you are instructing us to manage the administrative recording of these funds. Mukando Capital facilitates the transparency and record-keeping of these transactions but acts primarily as a technology provider.</p>

            <h2>3. ELIGIBILITY</h2>
            <p>Users must be 18 years or older to use the Platform. If you are a minor under the age of 18, you may only enter into this Agreement and register an account on the Mukando Capital platform with the prior written consent of one or more of your parents or legal guardians.</p>

            <h2>4. FEES AND CHARGES</h2>
            <p>All service fees are provided, calculated, and quoted in the App or on our website in accordance with our fee schedule published from time to time.</p>
            <ul>
              <li><strong>Amendments:</strong> We reserve the right to amend or vary the fees charged at any time. Any amendment will be deemed an amendment of this Agreement.</li>
              <li><strong>Objections:</strong> If you object to any amended fees, your sole remedy is to terminate your use of the Mukando Capital platform.</li>
              <li><strong>Currency:</strong> Unless otherwise stated, all fees are quoted in the applicable currency of operation (e.g., USD or ZiG) as indicated at the time of the transaction.</li>
            </ul>

            <h2>5. NO FINANCIAL ADVICE</h2>
            <p>Mukando Capital does not provide financial advice and does not employ financial advisers. The content and tools provided on the Platform are for administrative and informational purposes only. If you require financial advice, it is your responsibility to appoint a registered financial adviser or consultant.</p>

            <h2>6. PRIVACY AND DATA PROTECTION</h2>
            <p>We are committed to protecting your personal information in accordance with the <strong>Data Protection Act</strong> of Zimbabwe and other applicable local laws.</p>
            <ul>
              <li><strong>Consent:</strong> By using the Software, you consent to the processing of your personal information for the purpose of rendering our Services.</li>
              <li><strong>Data Security:</strong> We take reasonable steps to protect your data; however, messages sent over the internet (including email and mobile data) cannot be guaranteed to be completely secure.</li>
            </ul>

            <h2>7. USER RESPONSIBILITIES</h2>
            <ul>
              <li><strong>Account Security:</strong> You are responsible for maintaining the confidentiality of your account login details (username and password). You agree to notify us immediately of any unauthorised use of your account.</li>
              <li><strong>Accuracy:</strong> You warrant that all information provided to us (including identity and contact details) is true, accurate, and current.</li>
              <li><strong>Prohibited Use:</strong> You may not use the Platform for any illegal purpose, including money laundering, fraud, or the transmission of offensive or defamatory content.</li>
            </ul>

            <h2>8. LIMITATION OF LIABILITY</h2>
            <p>To the maximum extent permitted by Zimbabwean law:</p>
            <ul>
              <li>Mukando Capital, its directors, employees, and agents shall not be liable for any direct, indirect, incidental, or consequential damages arising out of your use of the Platform.</li>
              <li>We do not guarantee that the Platform will be error-free or uninterrupted.</li>
              <li>We are not responsible for the products or services provided by third-party financial institutions (e.g., banks) where your group's funds may be deposited.</li>
            </ul>

            <h2>9. DISPUTES</h2>
            <ul>
              <li><strong>Between Users:</strong> Should a dispute arise between members of a savings group (Mukando) regarding their private contributions or governance, said dispute is exclusively between those parties. Mukando Capital is not liable for resolving internal group disputes but may provide transaction logs to assist transparency.</li>
              <li><strong>With Mukando Capital:</strong> Any dispute arising between you and Mukando Capital regarding these Terms shall be governed by the laws of Zimbabwe.</li>
            </ul>

            <h2>10. TERMINATION</h2>
            <p>We reserve the right to restrict, suspend, or terminate your access to the Platform at our sole discretion, with reasonable notice, if you breach these Terms or for any other lawful reason. You may terminate this agreement by ceasing to use the Platform, provided all outstanding fees are paid.</p>

            <h2>11. CONTACT INFORMATION</h2>
            <p>For any queries, complaints, or legal notices, please contact us at:</p>
            <p><strong>Mukando Capital</strong><br />
              <strong>Address:</strong> Sub Division H, Binda Estate, Goromonzi, Zimbabwe<br />
              <strong>Phone:</strong> +263 784567174<br />
              <strong>Email:</strong> admin@mukandocapital.com</p>
          </div>
        </div>
      </main>
      <footer className="bg-primary text-primary-foreground py-8">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row justify-between gap-8">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-primary-foreground">Contact Us</h3>
              <p className="text-sm">+263 78 456 7174</p>
              <p className="text-sm">Sub Division H, Binda Estate, Goromonzi</p>
              <div className="flex space-x-4 mt-2">
                <Link href="#" className="hover:text-primary-foreground/80">
                  <Facebook className="h-5 w-5" />
                  <span className="sr-only">Facebook</span>
                </Link>
                <Link href="#" className="hover:text-primary-foreground/80">
                  <Twitter className="h-5 w-5" />
                  <span className="sr-only">X</span>
                </Link>
                <Link href="#" className="hover:text-primary-foreground/80">
                  <Instagram className="h-5 w-5" />
                  <span className="sr-only">Instagram</span>
                </Link>
              </div>
            </div>
            <div className="space-y-4 text-left md:text-right">
                <h3 className="text-lg font-semibold text-primary-foreground">Legal</h3>
                <nav className="flex flex-col space-y-2">
                    <Link href="/terms-of-use" className="text-sm hover:text-primary-foreground/80">Terms of Use</Link>
                    <Link href="/privacy-policy" className="text-sm hover:text-primary-foreground/80">Privacy Policy</Link>
                </nav>
            </div>
          </div>
          <div className="border-t border-primary-foreground/20 mt-8 pt-6 text-center text-xs">
            <p>© 2025 Mukando Capital. Built for Zimbabwe.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
