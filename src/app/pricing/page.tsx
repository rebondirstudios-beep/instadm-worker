import Link from "next/link";
import { MessageSquare, CheckCircle, ArrowRight } from "lucide-react";

export default function PricingPage() {
  const plans = [
    {
      name: "Starter",
      price: "$29",
      period: "/mo",
      description: "Perfect for individuals and small businesses getting started",
      features: [
        "1 Instagram Account",
        "100 DMs per day",
        "Basic Analytics",
        "Email Support",
        "Message Templates",
        "Lead Generation",
      ],
      notIncluded: [
        "Advanced Analytics",
        "Priority Support",
        "API Access",
        "Custom Integrations",
      ],
      popular: false,
      buttonText: "Get Started",
      buttonVariant: "outline",
    },
    {
      name: "Pro",
      price: "$59",
      period: "/mo",
      description: "Ideal for growing businesses and marketing teams",
      features: [
        "5 Instagram Accounts",
        "500 DMs per day",
        "Advanced Analytics",
        "Priority Support",
        "Message Templates",
        "Lead Generation",
        "A/B Testing",
        "Custom Scheduling",
      ],
      notIncluded: [
        "API Access",
        "Custom Integrations",
        "Dedicated Account Manager",
      ],
      popular: true,
      buttonText: "Get Started",
      buttonVariant: "default",
    },
    {
      name: "Enterprise",
      price: "$129",
      period: "/mo",
      description: "For large teams and agencies with advanced needs",
      features: [
        "Unlimited Instagram Accounts",
        "Unlimited DMs per day",
        "Custom Analytics Dashboard",
        "Dedicated Support",
        "Message Templates",
        "Lead Generation",
        "A/B Testing",
        "Custom Scheduling",
        "API Access",
        "Custom Integrations",
        "White Label Options",
        "Dedicated Account Manager",
      ],
      notIncluded: [],
      popular: false,
      buttonText: "Contact Sales",
      buttonVariant: "outline",
    },
  ];

  const faqs = [
    {
      question: "How does the free trial work?",
      answer: "Start with a 7-day free trial on any plan. No credit card required. You'll have full access to all features of your chosen plan during the trial period.",
    },
    {
      question: "Can I change plans anytime?",
      answer: "Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any differences.",
    },
    {
      question: "What happens if I exceed my daily DM limit?",
      answer: "You'll receive a notification when you're approaching your limit. Once reached, messaging will pause until the next day. You can upgrade your plan anytime to increase limits.",
    },
    {
      question: "Do you offer discounts for annual billing?",
      answer: "Yes! Save 20% with annual billing. Contact our sales team for custom enterprise pricing.",
    },
    {
      question: "Is my data secure?",
      answer: "Absolutely. We use industry-standard encryption and security practices. Your data is never shared with third parties, and all Instagram credentials are encrypted.",
    },
    {
      question: "What kind of support do you offer?",
      answer: "Starter plans get email support within 48 hours. Pro plans get priority email support within 24 hours. Enterprise plans get dedicated phone and email support.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
        <Link href="/" className="flex items-center space-x-2">
          <MessageSquare className="h-8 w-8 text-purple-600" />
          <span className="text-2xl font-bold text-gray-900">Rebondir Studios</span>
        </Link>
        <div className="flex items-center space-x-6">
          <Link href="/pricing" className="text-purple-600 font-medium">Pricing</Link>
          <Link href="/login" className="text-gray-600 hover:text-gray-900">Log In</Link>
          <Link 
            href="/signup" 
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Choose the perfect plan for your business. Start with a 7-day free trial, no credit card required.
          </p>
          <div className="flex items-center justify-center space-x-4">
            <div className="flex items-center space-x-2 text-gray-600">
              <span>Monthly</span>
              <div className="w-12 h-6 bg-gray-300 rounded-full relative">
                <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5 shadow-sm"></div>
              </div>
              <span>Annual (Save 20%)</span>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl ${
                plan.popular
                  ? "bg-purple-600 text-white shadow-2xl scale-105"
                  : "bg-white shadow-lg border border-gray-100"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-yellow-400 text-purple-900 px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </div>
                </div>
              )}
              
              <div className="p-8">
                <h3 className={`text-2xl font-bold mb-2 ${plan.popular ? "text-white" : "text-gray-900"}`}>
                  {plan.name}
                </h3>
                <div className="mb-4">
                  <span className={`text-4xl font-bold ${plan.popular ? "text-white" : "text-gray-900"}`}>
                    {plan.price}
                  </span>
                  <span className={`text-lg ${plan.popular ? "text-purple-100" : "text-gray-600"}`}>
                    {plan.period}
                  </span>
                </div>
                <p className={`mb-6 ${plan.popular ? "text-purple-100" : "text-gray-600"}`}>
                  {plan.description}
                </p>
                
                <Link
                  href="/signup"
                  className={`w-full py-3 rounded-lg font-semibold transition-colors text-center block ${
                    plan.popular
                      ? "bg-white text-purple-600 hover:bg-gray-100"
                      : "bg-purple-600 text-white hover:bg-purple-700"
                  }`}
                >
                  {plan.buttonText}
                </Link>
                
                <div className="mt-8 space-y-4">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start space-x-3">
                      <CheckCircle className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                        plan.popular ? "text-purple-200" : "text-green-600"
                      }`} />
                      <span className={`text-sm ${plan.popular ? "text-purple-100" : "text-gray-700"}`}>
                        {feature}
                      </span>
                    </div>
                  ))}
                  
                  {plan.notIncluded.map((feature) => (
                    <div key={feature} className="flex items-start space-x-3 opacity-60">
                      <div className={`h-5 w-5 mt-0.5 flex-shrink-0 rounded-full border-2 ${
                        plan.popular ? "border-purple-300" : "border-gray-300"
                      }`}></div>
                      <span className={`text-sm ${plan.popular ? "text-purple-200" : "text-gray-500"}`}>
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Comparison */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Compare All Features
          </h2>
          <p className="text-gray-600">
            See exactly what's included in each plan
          </p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Feature
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Starter
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pro
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Enterprise
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">Instagram Accounts</td>
                  <td className="px-6 py-4 text-sm text-center text-gray-900">1</td>
                  <td className="px-6 py-4 text-sm text-center text-gray-900">5</td>
                  <td className="px-6 py-4 text-sm text-center text-gray-900">Unlimited</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">Daily DM Limit</td>
                  <td className="px-6 py-4 text-sm text-center text-gray-900">100</td>
                  <td className="px-6 py-4 text-sm text-center text-gray-900">500</td>
                  <td className="px-6 py-4 text-sm text-center text-gray-900">Unlimited</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">Message Templates</td>
                  <td className="px-6 py-4 text-sm text-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                  </td>
                  <td className="px-6 py-4 text-sm text-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                  </td>
                  <td className="px-6 py-4 text-sm text-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                  </td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">Lead Generation</td>
                  <td className="px-6 py-4 text-sm text-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                  </td>
                  <td className="px-6 py-4 text-sm text-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                  </td>
                  <td className="px-6 py-4 text-sm text-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">Advanced Analytics</td>
                  <td className="px-6 py-4 text-sm text-center text-gray-400">Basic</td>
                  <td className="px-6 py-4 text-sm text-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                  </td>
                  <td className="px-6 py-4 text-sm text-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                  </td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">A/B Testing</td>
                  <td className="px-6 py-4 text-sm text-center text-gray-400">—</td>
                  <td className="px-6 py-4 text-sm text-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                  </td>
                  <td className="px-6 py-4 text-sm text-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">API Access</td>
                  <td className="px-6 py-4 text-sm text-center text-gray-400">—</td>
                  <td className="px-6 py-4 text-sm text-center text-gray-400">—</td>
                  <td className="px-6 py-4 text-sm text-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                  </td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">Priority Support</td>
                  <td className="px-6 py-4 text-sm text-center text-gray-400">Email (48h)</td>
                  <td className="px-6 py-4 text-sm text-center text-gray-900">Email (24h)</td>
                  <td className="px-6 py-4 text-sm text-center text-gray-900">Dedicated</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-gray-600">
            Got questions? We've got answers.
          </p>
        </div>
        
        <div className="space-y-6">
          {faqs.map((faq, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                {faq.question}
              </h3>
              <p className="text-gray-600">
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="bg-purple-600 rounded-2xl p-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to scale your Instagram outreach?
          </h2>
          <p className="text-xl text-purple-100 mb-8">
            Join thousands of businesses using Rebondir Studios to grow their customer base.
          </p>
          <Link 
            href="/signup" 
            className="bg-white text-purple-600 px-8 py-4 rounded-lg hover:bg-gray-50 transition-colors inline-flex items-center space-x-2"
          >
            <span>Start Your 7-day Free Trial</span>
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-6 w-6 text-purple-600" />
              <span className="text-lg font-semibold text-gray-900">Rebondir Studios</span>
            </div>
            <p className="text-gray-600">
              © 2024 Rebondir Studios. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
