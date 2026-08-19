'use client';

import { useState } from 'react';
import Link from 'next/link';

interface ChildrenPrivacyNoticeProps {
  userAge?: number;
  onAccept?: () => void;
  onDecline?: () => void;
}

export default function ChildrenPrivacyNotice({ 
  userAge, 
  onAccept, 
  onDecline 
}: ChildrenPrivacyNoticeProps) {
  const [acknowledged, setAcknowledged] = useState(false);

  // Determine if user is under age restrictions
  const isUnder13 = userAge && userAge < 13;
  const isUnder16 = userAge && userAge < 16;
  const requiresParentalConsent = isUnder13 || isUnder16;

  if (!requiresParentalConsent) {
    return null; // Don't show notice for older users
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center mb-6">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.623 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <h2 className="text-xl font-bold text-gray-900">
                Children's Privacy Protection Notice
              </h2>
              <p className="text-sm text-gray-600">
                Important information for users under {isUnder13 ? '13' : '16'}
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-4">
            {isUnder13 && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <h3 className="text-lg font-medium text-yellow-800 mb-2">
                  COPPA Protection (Under 13)
                </h3>
                <p className="text-yellow-700 text-sm">
                  You are under 13 years old. Under the Children's Online Privacy Protection Act (COPPA), 
                  we need your parent or guardian's permission before you can create an account.
                </p>
              </div>
            )}

            {isUnder16 && !isUnder13 && (
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                <h3 className="text-lg font-medium text-blue-800 mb-2">
                  GDPR Protection (Under 16)
                </h3>
                <p className="text-blue-700 text-sm">
                  You are under 16 years old. Under GDPR regulations, we need your parent or guardian's 
                  consent to process your personal data.
                </p>
              </div>
            )}

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">What This Means:</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Your parent/guardian must give permission for you to use I-Pass-A</li>
                <li>• We collect only educational information needed to help you learn</li>
                <li>• Your data is protected with special safeguards for children</li>
                <li>• Your parents can review, change, or delete your information anytime</li>
                <li>• We don't share your information with others for advertising</li>
              </ul>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">What We Collect:</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Your name and grade level</li>
                <li>• Quiz scores and learning progress</li>
                <li>• Questions you ask our AI tutor</li>
                <li>• Time spent studying (to help you learn better)</li>
              </ul>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-2">Next Steps:</h4>
              <ol className="text-sm text-gray-700 space-y-2">
                <li>1. Share this information with your parent or guardian</li>
                <li>2. Ask them to complete our parental consent form</li>
                <li>3. Once they give permission, you can start using I-Pass-A</li>
              </ol>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-purple-800">
                <strong>Remember:</strong> I-Pass-A is here to help you learn and do better in school. 
                We take your privacy seriously and will always protect your information.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Link
              href="/parental-consent"
              className="flex-1 bg-blue-600 text-white text-center py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Get Parental Consent Form
            </Link>
            
            <button
              onClick={onDecline}
              className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
            >
              I'll Ask My Parent Later
            </button>
          </div>

          {/* Additional Links */}
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-gray-600 text-center">
              Want to learn more? Read our{' '}
              <Link href="/privacy" className="text-blue-600 hover:underline">
                Privacy Policy
              </Link>{' '}
              and{' '}
              <Link href="/terms" className="text-blue-600 hover:underline">
                Terms of Use
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}