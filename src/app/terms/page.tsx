export default function TermsOfServicePage() {
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
            Terms of Service
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            Last updated: December 1, 2025
          </p>

          <div className="prose prose-gray dark:prose-invert max-w-none">
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                1. Acceptance of Terms
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                By accessing and using Tempo.io ("the Service"), you agree to be bound by these Terms of Service.
                If you do not agree to these terms, please do not use the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                2. Description of Service
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Tempo.io is a productivity application that provides:
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2 ml-4">
                <li>Pomodoro timer for focused work sessions</li>
                <li>Kanban-style task management with customizable projects</li>
                <li>Google Calendar integration for event synchronization</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                3. User Accounts
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                To use the Service, you must sign in with a Google account. You are responsible for:
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2 ml-4">
                <li>Maintaining the security of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized access</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                4. Acceptable Use
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                You agree not to:
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2 ml-4">
                <li>Use the Service for any unlawful purpose</li>
                <li>Attempt to gain unauthorized access to the Service</li>
                <li>Interfere with or disrupt the Service</li>
                <li>Upload malicious code or content</li>
                <li>Violate any applicable laws or regulations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                5. Intellectual Property
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                The Service and its original content, features, and functionality are owned by Tempo.io
                and are protected by international copyright, trademark, and other intellectual property laws.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                6. User Content
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                You retain ownership of any content you create using the Service (tasks, projects, etc.).
                By using the Service, you grant us a license to store and process your content solely
                for the purpose of providing the Service to you.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                7. Third-Party Services
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                The Service integrates with Google Calendar. Your use of Google services is subject to
                Google's Terms of Service and Privacy Policy. We are not responsible for the practices
                of third-party services.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                8. Disclaimer of Warranties
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                The Service is provided "as is" and "as available" without warranties of any kind,
                either express or implied. We do not guarantee that the Service will be uninterrupted,
                secure, or error-free.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                9. Limitation of Liability
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                To the maximum extent permitted by law, Tempo.io shall not be liable for any indirect,
                incidental, special, consequential, or punitive damages resulting from your use of
                or inability to use the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                10. Changes to Terms
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                We reserve the right to modify these terms at any time. We will notify users of any
                material changes by updating the "Last updated" date. Your continued use of the Service
                after changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                11. Termination
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                We may terminate or suspend your access to the Service immediately, without prior notice,
                for any reason, including breach of these Terms. Upon termination, your right to use the
                Service will cease immediately.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                12. Contact Us
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                If you have any questions about these Terms, please contact us at{' '}
                <a href="mailto:support@tempo.io" className="text-purple-500 hover:text-purple-600">
                  support@tempo.io
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
