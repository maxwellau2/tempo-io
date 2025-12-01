export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <a
          href="/login"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-8"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to login
        </a>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-8 md:p-12">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Privacy Policy
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            Last updated: December 1, 2025
          </p>

          <div className="prose prose-gray dark:prose-invert max-w-none">
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                1. Introduction
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Tempo.io ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy
                explains how we collect, use, disclose, and safeguard your information when you use our
                productivity application.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                2. Information We Collect
              </h2>

              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-3">
                2.1 Information from Google
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                When you sign in with Google, we receive:
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2 ml-4 mb-4">
                <li>Your name and email address</li>
                <li>Profile picture (if available)</li>
                <li>Google Calendar events (with your permission)</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-3">
                2.2 Information You Provide
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                We collect information you directly provide:
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2 ml-4 mb-4">
                <li>Projects and tasks you create</li>
                <li>Timer settings and preferences</li>
                <li>Any other content you input into the Service</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-3">
                2.3 Automatically Collected Information
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                We may automatically collect:
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2 ml-4">
                <li>Device information (browser type, operating system)</li>
                <li>Usage data (features used, time spent)</li>
                <li>Log data (IP address, access times)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                3. How We Use Your Information
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                We use your information to:
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2 ml-4">
                <li>Provide and maintain the Service</li>
                <li>Authenticate your identity</li>
                <li>Sync with your Google Calendar</li>
                <li>Save your tasks, projects, and preferences</li>
                <li>Improve and optimize the Service</li>
                <li>Respond to your inquiries and support requests</li>
                <li>Send important notices about the Service</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                4. Data Storage and Security
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Your data is stored securely using Supabase, a trusted cloud database provider.
                We implement appropriate technical and organizational measures to protect your
                personal information, including:
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2 ml-4">
                <li>Encryption of data in transit (HTTPS/TLS)</li>
                <li>Encryption of data at rest</li>
                <li>Row-level security policies</li>
                <li>Regular security audits</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                5. Data Sharing
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                We do not sell your personal information. We may share your information only in
                the following circumstances:
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2 ml-4">
                <li><strong>Service Providers:</strong> With trusted third parties who assist in operating our Service (e.g., Supabase for database, Google for authentication)</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
                <li><strong>With Your Consent:</strong> When you explicitly agree to sharing</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                6. Google Calendar Integration
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                When you connect your Google Calendar:
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2 ml-4">
                <li>We request access only to calendar events (read and write)</li>
                <li>We store access tokens securely to maintain your connection</li>
                <li>We use refresh tokens to keep you signed in</li>
                <li>You can revoke access at any time through your Google Account settings</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                7. Your Rights
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                You have the right to:
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2 ml-4">
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Correction:</strong> Request correction of inaccurate data</li>
                <li><strong>Deletion:</strong> Request deletion of your data</li>
                <li><strong>Export:</strong> Export your data in a portable format</li>
                <li><strong>Withdraw Consent:</strong> Revoke permissions at any time</li>
              </ul>
              <p className="text-gray-600 dark:text-gray-300 mt-4">
                To exercise these rights, please contact us at the email address below.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                8. Cookies and Local Storage
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                We use cookies and local storage to:
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2 ml-4">
                <li>Keep you signed in</li>
                <li>Store your preferences (e.g., theme settings)</li>
                <li>Maintain authentication tokens</li>
              </ul>
              <p className="text-gray-600 dark:text-gray-300 mt-4">
                These are essential for the Service to function and cannot be disabled.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                9. Children's Privacy
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                The Service is not intended for children under 13 years of age. We do not knowingly
                collect personal information from children under 13. If you believe we have collected
                information from a child under 13, please contact us immediately.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                10. International Data Transfers
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Your information may be transferred to and processed in countries other than your own.
                We ensure appropriate safeguards are in place to protect your information in accordance
                with this Privacy Policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                11. Changes to This Policy
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                We may update this Privacy Policy from time to time. We will notify you of any changes
                by updating the "Last updated" date and, for significant changes, by sending you a
                notification. We encourage you to review this policy periodically.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                12. Contact Us
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                If you have any questions about this Privacy Policy or our data practices, please contact us:
              </p>
              <ul className="list-none text-gray-600 dark:text-gray-300 space-y-2">
                <li>
                  <strong>Email:</strong>{' '}
                  <a href="mailto:privacy@tempo.io" className="text-purple-500 hover:text-purple-600">
                    privacy@tempo.io
                  </a>
                </li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
