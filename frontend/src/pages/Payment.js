import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Check, CreditCard, Smartphone, Globe, QrCode, Building2 } from 'lucide-react';

const Payment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get donation amount from route state, fallback to 50 if not provided
  const donationAmount = location.state?.donationAmount || 50;
  
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [copied, setCopied] = useState('');
  const [paymentComplete, setPaymentComplete] = useState(false);
  
  // Your actual payment details
  const paymentDetails = {
    upiId: 'vamshikrish502@okicici',
    accountHolder: 'Lingam Vamshi Krishna Reddy',
    bankName: 'State Bank of India (SBI)',
    accountNumber: '39640051877',
    ifscCode: 'SBIN0020716',
    bankLocation: 'India',
    accountType: 'Savings'
  };

  const handleCopy = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(''), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleBack = () => {
    navigate('/donation');
  };

  const handlePaymentComplete = () => {
    setPaymentComplete(true);
    setTimeout(() => {
      // Navigate back to donation page or home page after payment success
      navigate('/donation', { 
        state: { paymentSuccess: true, amount: donationAmount } 
      });
    }, 3000);
  };

  // Generate UPI payment URL for QR code
  const generateUPIUrl = () => {
    return `upi://pay?pa=${paymentDetails.upiId}&pn=${encodeURIComponent(paymentDetails.accountHolder)}&am=${donationAmount}&cu=INR&tn=${encodeURIComponent('Donation Support')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={handleBack}
            className="p-2 hover:bg-white hover:bg-opacity-50 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-6 w-6 text-gray-700" />
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Complete Payment</h1>
        </div>

        {paymentComplete ? (
          /* Success Message */
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Payment Successful! 🎉</h2>
            <p className="text-gray-600 mb-6">
              Thank you for your generous support of ₹{donationAmount}. 
              You're helping us keep the platform ad-free forever!
            </p>
            <div className="animate-pulse text-blue-600">
              Redirecting you back...
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Payment Amount Summary */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Support Amount</h2>
                <div className="text-4xl font-bold">₹{donationAmount}</div>
                <p className="text-blue-100 mt-2">One-time contribution • Lifetime benefits</p>
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Choose Payment Method</h3>
              
              <div className="grid md:grid-cols-2 gap-4 mb-8">
                {/* Indian UPI Payment */}
                <div 
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    paymentMethod === 'upi' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                  onClick={() => setPaymentMethod('upi')}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Smartphone className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">🇮🇳 Indian UPI Payment</h4>
                      <p className="text-gray-600 text-sm">For Indian users - Pay using any UPI app</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 ${
                      paymentMethod === 'upi' 
                        ? 'border-blue-500 bg-blue-500' 
                        : 'border-gray-300'
                    }`}>
                      {paymentMethod === 'upi' && (
                        <div className="w-full h-full rounded-full bg-white scale-50"></div>
                      )}
                    </div>
                  </div>
                </div>

                {/* International Wise Payment */}
                <div 
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    paymentMethod === 'wise' 
                      ? 'border-purple-500 bg-purple-50' 
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                  onClick={() => setPaymentMethod('wise')}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <Globe className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">🌍 International Payment</h4>
                      <p className="text-gray-600 text-sm">Pay via Wise (For international users)</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 ${
                      paymentMethod === 'wise' 
                        ? 'border-purple-500 bg-purple-500' 
                        : 'border-gray-300'
                    }`}>
                      {paymentMethod === 'wise' && (
                        <div className="w-full h-full rounded-full bg-white scale-50"></div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Indian UPI Payment Details */}
              {paymentMethod === 'upi' && (
                <div className="border rounded-lg p-6 bg-gray-50">
                  <h4 className="font-bold text-gray-900 mb-6 text-center flex items-center justify-center gap-2">
                    <QrCode className="h-5 w-5" />
                    Scan & Pay with UPI
                  </h4>
                         
                  {/* QR Code Container */}
                  <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
                    <div className="text-center">
                      <div className="bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg p-8 mb-4">
                        <div className="w-48 h-48 mx-auto bg-white rounded-lg shadow-sm flex flex-col items-center justify-center border-2 border-gray-200">
                          {/* QR Code Image */}
                          <div className="mb-4">
                            <img 
                              src="/images/upi-qr-code.png" 
                              alt="UPI QR Code for Payment"
                              className="w-32 h-32 object-contain"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'block';
                              }}
                            />
                            {/* Fallback text if image fails to load */}
                            <div className="hidden text-center">
                              <div className="w-32 h-32 bg-gray-200 rounded-lg flex items-center justify-center mb-2">
                                <QrCode className="h-16 w-16 text-gray-400" />
                              </div>
                              <p className="text-xs text-red-500">QR Code image not found</p>
                            </div>
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-bold text-gray-900">VAMSHI KRISHNA</p>
                            <p className="text-xs text-gray-600">SCAN & PAY ₹{donationAmount}</p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-4">
                          Scan this QR code with any UPI app
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* UPI ID */}
                  <div className="bg-white rounded-lg p-4 border mb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">UPI ID</p>
                        <p className="font-mono text-lg font-semibold text-gray-900">{paymentDetails.upiId}</p>
                      </div>
                      <button
                        onClick={() => handleCopy(paymentDetails.upiId, 'upi')}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        {copied === 'upi' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {copied === 'upi' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <h5 className="font-semibold text-blue-900 mb-2">How to pay:</h5>
                    <ol className="text-sm text-blue-800 space-y-1">
                      <li>1. Open any UPI app (PhonePe, Google Pay, Paytm, etc.)</li>
                      <li>2. Scan the QR code above or use UPI ID: {paymentDetails.upiId}</li>
                      <li>3. Enter amount: ₹{donationAmount}</li>
                      <li>4. Complete the payment</li>
                      <li>5. Click "I've completed payment" below</li>
                    </ol>
                  </div>

                  {/* Payment Confirmation Button */}
                  <div className="mt-6 pt-4 border-t">
                    <button
                      onClick={handlePaymentComplete}
                      className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white py-4 px-6 rounded-lg font-bold text-lg hover:from-green-600 hover:to-blue-600 transition-all duration-300 transform hover:scale-105 shadow-lg"
                    >
                      I've Completed the Payment ✓
                    </button>
                    <p className="text-xs text-gray-500 text-center mt-3">
                      Click only after successful payment completion
                    </p>
                  </div>
                </div>
              )}

              {/* International Wise Payment Details */}
              {paymentMethod === 'wise' && (
                <div className="border rounded-lg p-6 bg-gray-50">
                  <h4 className="font-bold text-gray-900 mb-6 text-center flex items-center justify-center gap-2">
                    <Globe className="h-5 w-5" />
                    🌍 International Donations via Wise
                  </h4>
                  
                  <div className="bg-white rounded-lg p-6 mb-6">
                    <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Building2 className="h-8 w-8 text-purple-600" />
                      </div>
                      <p className="text-gray-600 mb-4">
                        Send your donation using Wise (formerly TransferWise) - Fast, secure, and low-fee international transfers.
                      </p>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                        <p className="text-sm text-green-800">
                          <strong>✅ Wise now supports UPI transfers to India!</strong><br />
                          You can send money directly to our UPI ID or bank account.
                        </p>
                      </div>
                    </div>

                    {/* Two options for international donors */}
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Option A: UPI via Wise */}
                      <div className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
                        <h5 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
                          <Smartphone className="h-4 w-4" />
                          Option A: UPI Transfer (Recommended)
                        </h5>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">UPI ID:</span>
                            <div className="flex items-center gap-2">
                              <code className="bg-white px-2 py-1 rounded text-xs">{paymentDetails.upiId}</code>
                              <button
                                onClick={() => handleCopy(paymentDetails.upiId, 'wise-upi')}
                                className="text-purple-600 hover:text-purple-800"
                              >
                                {copied === 'wise-upi' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                              </button>
                            </div>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Name:</span>
                            <span className="text-gray-900 text-xs">{paymentDetails.accountHolder}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Amount:</span>
                            <span className="text-gray-900 font-semibold">₹{donationAmount}</span>
                          </div>
                        </div>
                      </div>

                      {/* Option B: Bank Transfer via Wise */}
                      <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                        <h5 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Option B: Bank Transfer
                        </h5>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Name:</span>
                            <span className="text-gray-900 text-xs">{paymentDetails.accountHolder}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Bank:</span>
                            <span className="text-gray-900 text-xs">{paymentDetails.bankName}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Account:</span>
                            <div className="flex items-center gap-2">
                              <code className="bg-white px-2 py-1 rounded text-xs">{paymentDetails.accountNumber}</code>
                              <button
                                onClick={() => handleCopy(paymentDetails.accountNumber, 'account')}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                {copied === 'account' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                              </button>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">IFSC:</span>
                            <div className="flex items-center gap-2">
                              <code className="bg-white px-2 py-1 rounded text-xs">{paymentDetails.ifscCode}</code>
                              <button
                                onClick={() => handleCopy(paymentDetails.ifscCode, 'ifsc')}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                {copied === 'ifsc' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                              </button>
                            </div>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Country:</span>
                            <span className="text-gray-900 text-xs">{paymentDetails.bankLocation}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Instructions */}
                    <div className="mt-6 p-4 bg-purple-50 rounded-lg">
                      <h5 className="font-semibold text-purple-900 mb-3">📝 Step-by-step instructions:</h5>
                      <ol className="text-sm text-purple-800 space-y-2">
                        <li className="flex items-start gap-2">
                          <span className="font-bold">1.</span>
                          <span>Visit <a href="https://wise.com" target="_blank" rel="noopener noreferrer" className="text-purple-600 underline hover:text-purple-800">wise.com</a> or open the Wise app</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-bold">2.</span>
                          <span>Choose "Send money" and select INR (Indian Rupees) as recipient currency</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-bold">3.</span>
                          <span>Enter the amount you want to send (in your currency)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-bold">4.</span>
                          <span>Choose either UPI transfer (Option A) or Bank transfer (Option B) above</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-bold">5.</span>
                          <span>Complete the payment with your preferred method</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-bold">6.</span>
                          <span>Funds will typically arrive within a few hours to 1 business day</span>
                        </li>
                      </ol>
                    </div>

                    {/* Benefits reminder */}
                    <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        <strong>💡 Why use Wise?</strong><br />
                        • Low fees and real exchange rates<br />
                        • Fast and secure transfers<br />
                        • No hidden costs<br />
                        • Supports UPI transfers to India<br />
                        • Available in 80+ countries
                      </p>
                    </div>

                    <div className="mt-6 text-center">
                      <a 
                        href="https://wise.com/send-money"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
                      >
                        <Globe className="h-5 w-5" />
                        Send Money via Wise
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Payment;