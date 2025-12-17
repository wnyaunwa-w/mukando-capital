
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Landmark, Facebook, Twitter, Instagram } from 'lucide-react';

export default function PrivacyPolicyPage() {
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
            <h1>MUKANDO CAPITAL PRIVACY POLICY</h1>
            <p className="text-sm text-muted-foreground"><strong>Last Updated:</strong> 6/12/25</p>

            <h2>1. INTRODUCTION</h2>
            <p>At <strong>Mukando Capital</strong> ("we," "us," or "our"), we are committed to protecting your privacy and ensuring that your personal information is collected and processed in a lawful, fair, and transparent manner.</p>
            <p>This Privacy Policy explains how we collect, use, disclose, and protect your personal information when you use our website, mobile application ("App"), and services. This policy complies with the <strong>Data Protection Act [Chapter 11:12]</strong> (the "Act") and the <strong>Cyber and Data Protection Regulations</strong> of Zimbabwe.</p>

            <h2>2. WHO WE ARE</h2>
            <p>Mukando Capital is the "Data Controller" responsible for your personal information.</p>
            <ul>
                <li><strong>Physical Address:</strong> Sub Division H, Binda Estate, Goromonzi, Zimbabwe</li>
                <li><strong>Phone Number:</strong> +263 78 456 7174</li>
                <li><strong>Email:</strong> admin@mukandocapital.com</li>
            </ul>

            <h2>3. THE DATA WE COLLECT</h2>
            <p>We may collect, process, store, and transfer different kinds of personal data about you, including:</p>
            <ul>
                <li><strong>Identity Data:</strong> First name, last name, username, National ID number, date of birth, and gender.</li>
                <li><strong>Contact Data:</strong> Billing address, email address, and telephone numbers.</li>
                <li><strong>Financial Data:</strong> Bank account details, mobile money numbers (e.g., EcoCash, InnBucks), and payment card details.</li>
                <li><strong>Transaction Data:</strong> Details about payments to and from you and other details of products/services you have purchased from us or through your savings group (Mukando).</li>
                <li><strong>Technical Data:</strong> Internet Protocol (IP) address, your login data, browser type and version, time zone setting, and operating system used to access our App.</li>
            </ul>

            <h2>4. HOW WE COLLECT YOUR DATA</h2>
            <p>We use different methods to collect data from and about you:</p>
            <ul>
                <li><strong>Direct Interactions:</strong> You may give us your Identity, Contact, and Financial Data by filling in forms on our App or by corresponding with us by phone, email, or WhatsApp.</li>
                <li><strong>Automated Technologies:</strong> As you interact with our Platform, we may automatically collect Technical Data about your equipment, browsing actions, and patterns.</li>
                <li><strong>Third Parties:</strong> We may receive personal data about you from third parties, such as verification services (KYC) or payment processors.</li>
            </ul>

            <h2>5. HOW WE USE YOUR PERSONAL INFORMATION</h2>
            <p>We will only use your personal information when the law allows us to. Most commonly, we will use your personal data in the following circumstances:</p>
            <ul>
                <li><strong>Service Provision:</strong> To register you as a new customer and manage your Mukando (savings group) accounts and contributions.</li>
                <li><strong>Legal Compliance:</strong> To comply with legal obligations, such as <strong>Anti-Money Laundering (AML)</strong> and <strong>Know Your Customer (KYC)</strong> regulations required by Zimbabwean law.</li>
                <li><strong>Communication:</strong> To notify you about changes to our terms or privacy policy, and to provide customer support.</li>
                <li><strong>Security:</strong> To detect and prevent fraud, spam, abuse, security incidents, and other harmful activity.</li>
            </ul>

            <h2>6. DISCLOSURE OF YOUR PERSONAL INFORMATION</h2>
            <p>We may share your personal information with the following parties:</p>
            <ul>
                <li><strong>Service Providers:</strong> Third-party companies that provide services to us, such as payment gateways, cloud hosting, and IT support.</li>
                <li><strong>Regulatory Authorities:</strong> The <strong>Postal and Telecommunications Regulatory Authority of Zimbabwe (POTRAZ)</strong>, the <strong>Financial Intelligence Unit (FIU)</strong>, or other government bodies if required by law.</li>
                <li><strong>Your Mukando Group:</strong> Limited information (such as contribution status) may be visible to other members of your specific savings group for transparency.</li>
            </ul>
            <p>We do not sell your personal data to third parties.</p>

            <h2>7. DATA SECURITY</h2>
            <p>We have put in place appropriate security measures to prevent your personal information from being accidentally lost, used, or accessed in an unauthorised way.</p>
            <ul>
                <li><strong>Encryption:</strong> We use encryption protocols to protect data during transmission.</li>
                <li><strong>Access Control:</strong> Access to your personal information is limited to employees, agents, and contractors who have a business need to know.</li>
                <li><strong>Breach Notification:</strong> In the unlikely event of a data breach that risks your rights and freedoms, we will notify you and the Data Protection Authority (POTRAZ) within <strong>24 hours</strong>, as required by Zimbabwean regulations.</li>
            </ul>

            <h2>8. DATA RETENTION</h2>
            <p>We will only retain your personal information for as long as necessary to fulfill the purposes we collected it for, including for the purposes of satisfying any legal, accounting, or reporting requirements. By law, we may be required to keep basic information about our customers for a minimum of <strong>five (5) years</strong> after they cease being customers for tax and legal purposes.</p>

            <h2>9. YOUR LEGAL RIGHTS</h2>
            <p>Under the Data Protection Act [Chapter 11:12], you have the right to:</p>
            <ul>
                <li><strong>Request access</strong> to your personal information.</li>
                <li><strong>Request correction</strong> of the personal information that we hold about you.</li>
                <li><strong>Request erasure</strong> of your personal information (subject to legal retention requirements).</li>
                <li><strong>Object to processing</strong> of your personal information.</li>
                <li><strong>Request the restriction</strong> of processing of your personal information.</li>
                <li><strong>Withdraw consent</strong> at any time where we are relying on consent to process your personal information.</li>
            </ul>
            <p>If you wish to exercise any of these rights, please contact our Data Protection Officer at the contact details provided below.</p>

            <h2>10. CONTACT US</h2>
            <p>If you have any questions about this Privacy Policy or our privacy practices, please contact us:</p>
            <p><strong>Mukando Capital</strong><br />
              <strong>Address:</strong> Sub Division H, Binda Estate, Goromonzi, Zimbabwe<br />
              <strong>Phone:</strong> +263 784567174<br />
              <strong>Email:</strong> admin@mukandocapital.com</p>

            <h2>11. CHANGES TO THIS POLICY</h2>
            <p>We may update this Privacy Policy from time to time. Any changes will be posted on this page, and if the changes are significant, we will provide a more prominent notice (e.g., email notification or in-app pop-up).</p>
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
