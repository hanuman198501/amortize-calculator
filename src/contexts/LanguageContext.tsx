import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'en' | 'hi';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
}

const translations = {
  en: {
    // Navigation
    'nav.amortization': 'Amortization Calculator',
    'nav.emi': 'EMI Calculator',
    
    // Loan Parameters
    'loan.parameters': 'Loan Parameters',
    'loan.amount': 'Loan Amount (₹)',
    'loan.tenure': 'Loan Tenure (Years)',
    'loan.interestRate': 'Interest Rate (%)',
    'loan.startDate': 'Loan Start Date',
    'loan.calculate': 'Calculate',
    
    // EMI Calculator
    'emi.title': 'EMI Calculator',
    'emi.loanDetails': 'Loan Details',
    'emi.breakdown': 'EMI Breakdown',
    'emi.monthlyEmi': 'Monthly EMI',
    'emi.totalInterest': 'Total Interest',
    'emi.totalAmount': 'Total Amount',
    'emi.interestPortion': 'Interest Portion',
    'emi.principalPortion': 'Principal Portion',
    
    // Amortization
    'amortization.title': 'Loan Amortization Calculator',
    'amortization.schedule': 'Amortization Schedule',
    'amortization.summary': 'Loan Summary',
    'amortization.graphs': 'Graphs',
    'amortization.advancedOptions': 'Advanced Options (Optional)',
    'amortization.extraPayments': 'Extra Payment by Month',
    'amortization.variableRates': 'Variable Interest Rates',
    'amortization.addRate': 'Add Rate',
    'amortization.addPayment': 'Add Payment',
    
    // Table Headers
    'table.month': 'Month',
    'table.date': 'Date',
    'table.rate': 'Rate (%)',
    'table.openingBalance': 'Opening Balance',
    'table.emi': 'EMI',
    'table.extraPayment': 'Extra Payment',
    'table.totalPayment': 'Total Payment',
    'table.interestPaid': 'Interest Paid',
    'table.principalPaid': 'Principal Paid',
    'table.remainingBalance': 'Remaining Balance',
    'table.amount': 'Amount (₹)',
    'table.actions': 'Actions',
    
    // Summary
    'summary.totalInterest': 'Total Interest Paid',
    'summary.totalPrincipal': 'Total Principal Paid',
    'summary.totalAmount': 'Total Amount Paid',
    'summary.totalExtraPayments': 'Total Extra Payments',
    'summary.interestSaved': 'Interest Saved',
    'summary.timeSaved': 'Time Saved',
    'summary.months': 'months',
    
    // Charts
    'charts.paymentBreakdown': 'Payment Breakdown',
    'charts.principal': 'Principal',
    'charts.interest': 'Interest',
    'charts.monthlyPayments': 'Monthly Payments Over Time',
    'charts.balanceOverTime': 'Balance Over Time',
    
    // Tooltips
    'tooltip.loanAmount': 'Enter the total loan amount you want to borrow',
    'tooltip.tenure': 'Enter the loan tenure in years',
    'tooltip.interestRate': 'Enter the annual interest rate percentage',
    'tooltip.startDate': 'Select the loan start date',
    'tooltip.extraPayments': 'Add extra payments for specific months to reduce interest',
    'tooltip.variableRates': 'Add different interest rates for different periods',
    
    // Error Messages
    'error.inputRequired': 'Input Required',
    'error.fillAllFields': 'Please fill in all fields',
    'error.invalidInput': 'Invalid Input',
    'error.positiveValues': 'Please enter valid positive values',
    'error.calculationError': 'Calculation Error',
    'error.checkInputs': 'Please check your inputs and try again',
    
    // Success Messages
    'success.emiCalculated': 'EMI Calculated',
    'success.yourMonthlyEmi': 'Your monthly EMI is',
    'success.calculationComplete': 'Calculation Complete',
    'success.generatedSchedule': 'Generated {count} month schedule',
    
    // UI Elements
    'ui.calculating': 'Calculating...',
    'ui.selectMonth': 'Select month',
    'ui.placeholder.enterLoanAmount': 'Enter loan amount',
    'ui.placeholder.enterTenure': 'Enter tenure in months',
    'ui.placeholder.enterInterestRate': 'Enter annual interest rate',
    'ui.placeholder.enterFixedEmi': 'Enter fixed EMI',
    'ui.educationalPurpose': 'This tool is for educational purposes only. Actual loan details may vary from bank to bank.',
    
    // Calculation Mode
    'calculation.mode': 'Calculation Mode',
    'calculation.interestRateSchedule': 'Interest Rate Schedule',
    'calculation.defaultExtraPayment': 'Default Extra Payment',
    'calculation.extraPaymentsByMonth': 'Extra Payments by Month',
    
    // Tooltips for advanced features
    'tooltip.interestRateSchedule': 'Define when interest rates change during the loan period',
    'tooltip.advancedOptions': 'Configure additional payment settings and monthly extras',
    'tooltip.defaultExtraPayment': 'Additional amount you\'ll pay each month to reduce principal',
    'tooltip.extraPaymentsByMonth': 'Schedule additional payments for specific months',
    
    // Language
    'language.english': 'English',
    'language.hindi': 'हिंदी',
  },
  hi: {
    // Navigation
    'nav.amortization': 'ऋण परिशोधन कैलकुलेटर',
    'nav.emi': 'ईएमआई कैलकुलेटर',
    
    // Loan Parameters
    'loan.parameters': 'ऋण पैरामीटर',
    'loan.amount': 'ऋण राशि (₹)',
    'loan.tenure': 'ऋण अवधि (वर्ष)',
    'loan.interestRate': 'ब्याज दर (%)',
    'loan.startDate': 'ऋण प्रारंभ दिनांक',
    'loan.calculate': 'गणना करें',
    
    // EMI Calculator
    'emi.title': 'ईएमआई कैलकुलेटर',
    'emi.loanDetails': 'ऋण विवरण',
    'emi.breakdown': 'ईएमआई विभाजन',
    'emi.monthlyEmi': 'मासिक ईएमआई',
    'emi.totalInterest': 'कुल ब्याज',
    'emi.totalAmount': 'कुल राशि',
    'emi.interestPortion': 'ब्याज हिस्सा',
    'emi.principalPortion': 'मूलधन हिस्सा',
    
    // Amortization
    'amortization.title': 'ऋण परिशोधन कैलकुलेटर',
    'amortization.schedule': 'परिशोधन अनुसूची',
    'amortization.summary': 'ऋण सारांश',
    'amortization.graphs': 'ग्राफ',
    'amortization.advancedOptions': 'उन्नत विकल्प (वैकल्पिक)',
    'amortization.extraPayments': 'माह के अनुसार अतिरिक्त भुगतान',
    'amortization.variableRates': 'परिवर्तनीय ब्याज दरें',
    'amortization.addRate': 'दर जोड़ें',
    'amortization.addPayment': 'भुगतान जोड़ें',
    
    // Table Headers
    'table.month': 'महीना',
    'table.date': 'दिनांक',
    'table.rate': 'दर (%)',
    'table.openingBalance': 'प्रारंभिक शेष',
    'table.emi': 'ईएमआई',
    'table.extraPayment': 'अतिरिक्त भुगतान',
    'table.totalPayment': 'कुल भुगतान',
    'table.interestPaid': 'भुगतान किया गया ब्याज',
    'table.principalPaid': 'भुगतान किया गया मूलधन',
    'table.remainingBalance': 'शेष राशि',
    'table.amount': 'राशि (₹)',
    'table.actions': 'क्रियाएं',
    
    // Summary
    'summary.totalInterest': 'कुल ब्याज भुगतान',
    'summary.totalPrincipal': 'कुल मूलधन भुगतान',
    'summary.totalAmount': 'कुल राशि भुगतान',
    'summary.totalExtraPayments': 'कुल अतिरिक्त भुगतान',
    'summary.interestSaved': 'बचा हुआ ब्याज',
    'summary.timeSaved': 'बचा हुआ समय',
    'summary.months': 'महीने',
    
    // Charts
    'charts.paymentBreakdown': 'भुगतान विभाजन',
    'charts.principal': 'मूलधन',
    'charts.interest': 'ब्याज',
    'charts.monthlyPayments': 'समय के साथ मासिक भुगतान',
    'charts.balanceOverTime': 'समय के साथ शेष राशि',
    
    // Tooltips
    'tooltip.loanAmount': 'कुल ऋण राशि दर्ज करें जो आप उधार लेना चाहते हैं',
    'tooltip.tenure': 'ऋण अवधि वर्षों में दर्ज करें',
    'tooltip.interestRate': 'वार्षिक ब्याज दर प्रतिशत दर्ज करें',
    'tooltip.startDate': 'ऋण प्रारंभ दिनांक चुनें',
    'tooltip.extraPayments': 'ब्याज कम करने के लिए विशिष्ट महीनों के लिए अतिरिक्त भुगतान जोड़ें',
    'tooltip.variableRates': 'विभिन्न अवधियों के लिए अलग ब्याज दरें जोड़ें',
    
    // Error Messages
    'error.inputRequired': 'इनपुट आवश्यक',
    'error.fillAllFields': 'कृपया सभी क्षेत्रों को भरें',
    'error.invalidInput': 'अमान्य इनपुट',
    'error.positiveValues': 'कृपया वैध धनात्मक मान दर्ज करें',
    'error.calculationError': 'गणना त्रुटि',
    'error.checkInputs': 'कृपया अपने इनपुट की जांच करें और पुनः प्रयास करें',
    
    // Success Messages
    'success.emiCalculated': 'ईएमआई गणना',
    'success.yourMonthlyEmi': 'आपका मासिक ईएमआई है',
    'success.calculationComplete': 'गणना पूर्ण',
    'success.generatedSchedule': '{count} महीने की अनुसूची तैयार की गई',
    
    // UI Elements
    'ui.calculating': 'गणना हो रही है...',
    'ui.selectMonth': 'महीना चुनें',
    'ui.placeholder.enterLoanAmount': 'ऋण राशि दर्ज करें',
    'ui.placeholder.enterTenure': 'महीनों में अवधि दर्ज करें',
    'ui.placeholder.enterInterestRate': 'वार्षिक ब्याज दर दर्ज करें',
    'ui.placeholder.enterFixedEmi': 'निश्चित ईएमआई दर्ज करें',
    'ui.educationalPurpose': 'यह उपकरण केवल शैक्षिक उद्देश्यों के लिए है। वास्तविक ऋण विवरण बैंक से बैंक में भिन्न हो सकते हैं।',
    
    // Calculation Mode
    'calculation.mode': 'गणना मोड',
    'calculation.interestRateSchedule': 'ब्याज दर अनुसूची',
    'calculation.defaultExtraPayment': 'डिफ़ॉल्ट अतिरिक्त भुगतान',
    'calculation.extraPaymentsByMonth': 'माह के अनुसार अतिरिक्त भुगतान',
    
    // Tooltips for advanced features
    'tooltip.interestRateSchedule': 'ऋण अवधि के दौरान ब्याज दरों में बदलाव कब होगा, इसे परिभाषित करें',
    'tooltip.advancedOptions': 'अतिरिक्त भुगतान सेटिंग्स और मासिक अतिरिक्त राशि कॉन्फ़िगर करें',
    'tooltip.defaultExtraPayment': 'मूलधन कम करने के लिए आप हर महीने अतिरिक्त राशि का भुगतान करेंगे',
    'tooltip.extraPaymentsByMonth': 'विशिष्ट महीनों के लिए अतिरिक्त भुगतान शेड्यूल करें',
    
    // Language
    'language.english': 'English',
    'language.hindi': 'हिंदी',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['en']] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};