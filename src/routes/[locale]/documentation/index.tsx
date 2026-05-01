import { component$, useSignal, $ } from '@builder.io/qwik';
import {
  LuBook,
  LuFileText,
  LuShield,
  LuHelpCircle,
  LuWallet,
  LuCoins,
  LuShoppingCart,
  LuHome,
  LuZap,
  LuAlertTriangle,
  LuChevronDown,
  LuPlayCircle,
  LuLayers,
  LuCheckCircle2,
  LuClock,
  LuUpload,
  LuImage,
  LuMapPin,
  LuTrendingUp,
  LuDownload
} from '@qwikest/icons/lucide';
import { useLocation, type DocumentHead } from '@builder.io/qwik-city';
import { isBrowser } from '@builder.io/qwik/build';
import { inlineTranslate, useSpeak } from 'qwik-speak';
import { buildSeo, localeFromParams } from '~/utils/seo';
export default component$(() => {
  useSpeak({ runtimeAssets: ['docs'] });
  const t = inlineTranslate();
  const loc = useLocation();
  const localeBase = `/${loc.params.locale || 'en-us'}`;
  const expandedSections = useSignal<Record<string, boolean>>({
    wallet: false,
    tokens: false,
    mint: false,
    buy: false,
    rent: false,
    power: false,
  });

  return (
    <div class="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero mejorado */}
      <section class="relative overflow-hidden bg-gradient-to-r from-[#c1272d] to-[#d13238] py-24 sm:py-32">
        {/* Efectos de fondo animados */}
        <div class="absolute inset-0 overflow-hidden">
          <div class="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div class="absolute -bottom-40 -left-40 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" style="animation-delay: 1s"></div>
        </div>

        <div class="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div class="text-center">
            <div class="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white text-sm font-medium mb-6">
              <LuBook class="w-4 h-4" />
              {t('docs.hero.badge@@Complete step-by-step whitepaper')}
            </div>

            <h1 class="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight tracking-tight">
              {t('docs.hero.title1@@KNRT Marketplace')}
              <span class="block text-white/90 mt-2">{t('docs.hero.title2@@For Everyone')}</span>
            </h1>

            <p class="text-xl sm:text-2xl text-white/90 max-w-3xl mx-auto mb-10">
              {t('docs.hero.subtitle1@@Learn to create, buy, sell and rent NFTs on the blockchain.')}
              <span class="block mt-2 font-semibold">{t('docs.hero.subtitle2@@No prior technical knowledge required.')}</span>
            </p>

            {/* Métricas clave */}
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto mb-10">
              <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-200 shadow-sm">
                <div class="text-3xl font-bold text-[#c1272d]">3</div>
                <div class="text-sm text-gray-600 mt-1">{t('docs.hero.stats.markets@@Markets')}</div>
              </div>
              <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-200 shadow-sm">
                <div class="text-3xl font-bold text-[#c1272d]">7</div>
                <div class="text-sm text-gray-600 mt-1">{t('docs.hero.stats.steps@@Simple Steps')}</div>
              </div>
              <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-200 shadow-sm">
                <div class="text-3xl font-bold text-[#c1272d]">100%</div>
                <div class="text-sm text-gray-600 mt-1">{t('docs.hero.stats.secure@@Secure')}</div>
              </div>
            </div>

            <div class="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="#empezar"
                class="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-[#c1272d] rounded-2xl font-bold text-lg hover:bg-gray-100 transition-all shadow-xl"
              >
                <LuPlayCircle class="w-5 h-5" />
                Get Started
              </a>
              <button
                onClick$={$(async () => {
                  if (!isBrowser) return;

                  // Dynamic import jsPDF
                  const { default: jsPDF } = await import('jspdf');
                  const autoTable = (await import('jspdf-autotable')).default;

                  // Create document with very large height for continuous page
                  const doc = new jsPDF({
                    unit: 'mm',
                    format: [210, 10000] // A4 width (210mm) x very tall height (10000mm)
                  });
                  const pageWidth = doc.internal.pageSize.getWidth();
                  const marginLeft = 15;
                  const marginRight = 15;
                  const marginTop = 15;
                  const marginBottom = 15;
                  const contentWidth = pageWidth - marginLeft - marginRight;
                  let yPos = 20;
                  let maxYPos = 20; // Track maximum Y position used

                  // Helper function - now just tracks max Y position, no page breaks
                  const checkPageBreak = (spaceNeeded: number) => {
                    // No page breaks in continuous mode, just track position
                    maxYPos = Math.max(maxYPos, yPos + spaceNeeded);
                    return false;
                  };

                  // Helper to add section with styled header
                  const addSectionHeader = (title: string, level: number = 1) => {
                    checkPageBreak(20);
                    if (level === 1) {
                      doc.setFillColor(193, 39, 45);
                      doc.rect(marginLeft - 5, yPos - 5, contentWidth + 10, 12, 'F');
                      doc.setTextColor(255, 255, 255);
                      doc.setFontSize(18);
                      doc.setFont('helvetica', 'bold');
                      doc.text(title, marginLeft, yPos + 3);
                      yPos += 17;
                    } else if (level === 2) {
                      doc.setFillColor(240, 240, 240);
                      doc.rect(marginLeft - 3, yPos - 3, contentWidth + 6, 8, 'F');
                      doc.setTextColor(193, 39, 45);
                      doc.setFontSize(14);
                      doc.setFont('helvetica', 'bold');
                      doc.text(title, marginLeft, yPos + 2);
                      yPos += 12;
                    }
                    doc.setTextColor(51, 51, 51);
                  };

                  // Helper to add text with word wrap
                  const addText = (text: string, indent: number = 0, fontSize: number = 10, fontStyle: 'normal' | 'bold' = 'normal') => {
                    doc.setFontSize(fontSize);
                    doc.setFont('helvetica', fontStyle);
                    const lines = doc.splitTextToSize(text, contentWidth - indent);
                    lines.forEach((line: string) => {
                      checkPageBreak(7);
                      doc.text(line, marginLeft + indent, yPos);
                      yPos += fontSize === 10 ? 5 : 6;
                    });
                    return lines.length;
                  };

                  // Helper to add info box
                  const addInfoBox = (title: string, content: string, r: number = 240, g: number = 240, b: number = 240) => {
                    checkPageBreak(40);
                    const boxStartY = yPos;
                    const boxPadding = 8;

                    // Calculate content height
                    doc.setFontSize(10);
                    const contentLines = doc.splitTextToSize(content, contentWidth - (boxPadding * 2));
                    const contentHeight = contentLines.length * 5;
                    const totalBoxHeight = 10 + contentHeight + boxPadding;

                    // Draw box
                    doc.setFillColor(r, g, b);
                    doc.roundedRect(marginLeft, boxStartY, contentWidth, totalBoxHeight, 3, 3, 'F');

                    // Determine text color based on background darkness
                    const isDarkBackground = (r + g + b) / 3 < 128; // Average RGB < 128 means dark
                    const textColor = isDarkBackground ? [255, 255, 255] : [51, 51, 51];

                    // Draw title
                    doc.setFontSize(11);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
                    doc.text(title, marginLeft + boxPadding, boxStartY + 7);

                    // Draw content
                    yPos = boxStartY + 14;
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(10);
                    contentLines.forEach((line: string) => {
                      doc.text(line, marginLeft + boxPadding, yPos);
                      yPos += 5;
                    });

                    yPos += boxPadding - 3;
                    doc.setTextColor(51, 51, 51); // Reset to default
                  };

                  // ==================== COVER PAGE ====================
                  // Gradient header background
                  doc.setFillColor(193, 39, 45);
                  doc.rect(0, 0, pageWidth, 100, 'F');
                  doc.setFillColor(209, 50, 56);
                  for (let i = 100; i > 70; i -= 2) {
                    const alpha = (100 - i) / 30;
                    doc.setFillColor(209 - alpha * 16, 50 - alpha * 11, 56 - alpha * 11);
                    doc.rect(0, i, pageWidth, 2, 'F');
                  }

                  // Title section
                  doc.setTextColor(255, 255, 255);
                  doc.setFontSize(32);
                  doc.setFont('helvetica', 'bold');
                  doc.text('KNRT MARKETPLACE', pageWidth / 2, 30, { align: 'center' });

                  doc.setFontSize(18);
                  doc.setFont('helvetica', 'normal');
                  doc.text('Technical Whitepaper', pageWidth / 2, 45, { align: 'center' });

                  doc.setFontSize(12);
                  doc.text('Decentralized NFT Ecosystem on Base L2', pageWidth / 2, 58, { align: 'center' });

                  doc.setFontSize(10);
                  doc.text('Version 1.0 | November 2025', pageWidth / 2, 70, { align: 'center' });

                  // Abstract box
                  yPos = 110;
                  doc.setFillColor(245, 245, 245);
                  doc.roundedRect(marginLeft, yPos, contentWidth, 50, 3, 3, 'F');
                  doc.setDrawColor(193, 39, 45);
                  doc.setLineWidth(0.5);
                  doc.roundedRect(marginLeft, yPos, contentWidth, 50, 3, 3, 'S');

                  doc.setTextColor(193, 39, 45);
                  doc.setFontSize(14);
                  doc.setFont('helvetica', 'bold');
                  doc.text('ABSTRACT', marginLeft + 5, yPos + 8);

                  doc.setTextColor(51, 51, 51);
                  doc.setFontSize(10);
                  doc.setFont('helvetica', 'normal');
                  const abstract = 'KNRT Marketplace is a comprehensive decentralized platform built on the Base Layer 2 network, designed to democratize access to NFT technology. This whitepaper provides a complete technical and operational Whitepaper for users, creators, and investors seeking to participate in the digital asset economy. The platform offers NFT minting, trading, rental systems, and rights delegation mechanisms, all secured by smart contracts and optimized for minimal transaction costs.';
                  const abstractLines = doc.splitTextToSize(abstract, contentWidth - 10);
                  let tempY = yPos + 15;
                  abstractLines.forEach((line: string) => {
                    doc.text(line, marginLeft + 5, tempY);
                    tempY += 5;
                  });

                  // Key features bullets
                  yPos = 170;
                  doc.setFontSize(12);
                  doc.setFont('helvetica', 'bold');
                  doc.setTextColor(193, 39, 45);
                  doc.text('KEY FEATURES:', marginLeft, yPos);
                  yPos += 8;

                  doc.setFontSize(10);
                  doc.setFont('helvetica', 'normal');
                  doc.setTextColor(51, 51, 51);
                  const keyFeatures = [
                    '• NFT Creation & Minting Infrastructure',
                    '• Decentralized Marketplace with KNRT Token Economy',
                    '• Innovative Rental System for Passive Income',
                    '• Rights Delegation & Asset Management Tools',
                    '• Built-in DEX for Token Swapping',
                    '• Low-cost Transactions on Base Network ($0.01-$1.00)',
                    '• Enterprise-grade Security & Smart Contract Auditing'
                  ];
                  keyFeatures.forEach(feature => {
                    doc.text(feature, marginLeft, yPos);
                    yPos += 6;
                  });

                  // Footer of cover page
                  yPos += 15;
                  doc.setFontSize(9);
                  doc.setTextColor(150, 150, 150);
                  doc.text('© 2025 KNRT Marketplace. All Rights Reserved.', pageWidth / 2, yPos, { align: 'center' });
                  yPos += 5;
                  doc.text('For more information visit: marketplace.knrt.io', pageWidth / 2, yPos, { align: 'center' });

                  // ==================== TABLE OF CONTENTS ====================
                  yPos += 25;
                  doc.setTextColor(0, 0, 0);

                  addSectionHeader('TABLE OF CONTENTS', 1);
                  yPos += 10;

                  const tocItems = [
                    { title: '1. EXECUTIVE SUMMARY', page: 3 },
                    { title: '2. INTRODUCTION TO KNRT MARKETPLACE', page: 4 },
                    { title: '   2.1 Platform Overview', page: 4 },
                    { title: '   2.2 Mission & Vision', page: 5 },
                    { title: '3. TECHNICAL ARCHITECTURE', page: 6 },
                    { title: '   3.1 Base Layer 2 Network', page: 6 },
                    { title: '   3.2 Smart Contract Infrastructure', page: 6 },
                    { title: '   3.3 Token Economy (KNRT)', page: 7 },
                    { title: '4. CORE FEATURES & FUNCTIONALITY', page: 8 },
                    { title: '   4.1 NFT Creation & Minting', page: 8 },
                    { title: '   4.2 Marketplace Trading', page: 9 },
                    { title: '   4.3 Rental System', page: 10 },
                    { title: '   4.4 Rights Delegation', page: 11 },
                    { title: '   4.5 Token Swapping (DEX)', page: 12 },
                    { title: '5. GETTING STARTED - STEP BY STEP', page: 13 },
                    { title: '   5.1 Setting Up Your Wallet', page: 13 },
                    { title: '   5.2 Connecting to Base Network', page: 14 },
                    { title: '   5.3 Acquiring KNRT Tokens', page: 15 },
                    { title: '   5.4 Your First NFT Purchase', page: 16 },
                    { title: '   5.5 Creating Your First NFT', page: 17 },
                    { title: '6. UNDERSTANDING BLOCKCHAIN CONCEPTS', page: 18 },
                    { title: '7. SECURITY & BEST PRACTICES', page: 20 },
                    { title: '8. FREQUENTLY ASKED QUESTIONS', page: 22 },
                    { title: '9. GLOSSARY', page: 24 },
                    { title: '10. ADDITIONAL RESOURCES', page: 26 },
                  ];

                  doc.setFontSize(10);
                  doc.setFont('helvetica', 'normal');
                  doc.setTextColor(51, 51, 51);

                  tocItems.forEach(item => {
                    checkPageBreak(8);
                    const isSubitem = item.title.startsWith('   ');
                    const xOffset = isSubitem ? marginLeft + 10 : marginLeft;
                    doc.text(item.title, xOffset, yPos);
                    doc.text(String(item.page), pageWidth - marginRight - 5, yPos);

                    // Dotted line (using periods instead of dashed line)
                    doc.setDrawColor(200, 200, 200);
                    const dotStart = xOffset + doc.getTextWidth(item.title) + 3;
                    const dotEnd = pageWidth - marginRight - 15;
                    for (let x = dotStart; x < dotEnd; x += 3) {
                      doc.circle(x, yPos - 1, 0.3, 'F');
                    }

                    yPos += 7;
                  });

                  // ==================== EXECUTIVE SUMMARY ====================
                  yPos += 25;

                  addSectionHeader('1. EXECUTIVE SUMMARY', 1);
                  yPos += 5;

                  addText('KNRT Marketplace represents a paradigm shift in the accessibility and usability of NFT technology. Built on Coinbase\'s Base Layer 2 network, our platform combines enterprise-grade security with user-friendly design, enabling anyone—regardless of technical expertise—to participate in the digital asset economy.', 0, 11);
                  yPos += 10;

                  addSectionHeader('Market Opportunity', 2);
                  addText('The global NFT market has grown exponentially, yet remains largely inaccessible to mainstream users due to technical complexity and high transaction costs. KNRT Marketplace addresses these barriers by:', 0, 10);
                  yPos += 5;

                  const marketPoints = [
                    'Reducing transaction costs by 95% compared to Ethereum mainnet',
                    'Eliminating technical jargon with intuitive, beginner-friendly interfaces',
                    'Providing comprehensive educational resources for all users',
                    'Offering innovative revenue models through NFT rentals and rights delegation',
                    'Ensuring transparent, fair pricing with zero hidden fees'
                  ];

                  marketPoints.forEach(point => {
                    checkPageBreak(6);
                    doc.setFontSize(10);
                    doc.text('• ' + point, marginLeft + 5, yPos);
                    const pointLines = doc.splitTextToSize(point, contentWidth - 10);
                    yPos += pointLines.length * 5 + 2;
                  });
                  yPos += 5;

                  addSectionHeader('Technology Stack', 2);
                  addText('KNRT Marketplace leverages cutting-edge blockchain infrastructure:', 0, 10);
                  yPos += 5;

                  const techStack = [
                    { label: 'Blockchain:', value: 'Base Layer 2 (Built on Ethereum, by Coinbase)' },
                    { label: 'Network ID:', value: 'Chain 8453' },
                    { label: 'Token Standard:', value: 'ERC-20 (KNRT), ERC-721 (NFTs)' },
                    { label: 'Average Gas Cost:', value: '$0.01 - $1.00 per transaction' },
                    { label: 'Transaction Speed:', value: '2-5 seconds confirmation time' },
                    { label: 'Security:', value: 'Audited smart contracts, decentralized validation' }
                  ];

                  techStack.forEach(item => {
                    checkPageBreak(6);
                    doc.setFont('helvetica', 'bold');
                    doc.text(item.label, marginLeft + 5, yPos);
                    doc.setFont('helvetica', 'normal');
                    doc.text(item.value, marginLeft + 40, yPos);
                    yPos += 6;
                  });
                  yPos += 8;

                  addSectionHeader('Value Proposition', 2);

                  const valueProps = [
                    {
                      title: 'For Creators:',
                      desc: 'Mint and sell digital art, music, videos, and collectibles with full ownership rights. Earn passive income through rental systems and maintain control over your intellectual property.'
                    },
                    {
                      title: 'For Collectors:',
                      desc: 'Build diverse NFT portfolios with transparent pricing and verified authenticity. Generate passive income by renting out unused NFTs to other users.'
                    },
                    {
                      title: 'For Investors:',
                      desc: 'Access emerging digital asset markets with low entry barriers. Utilize rights delegation to maximize returns and participate in platform governance.'
                    },
                    {
                      title: 'For Beginners:',
                      desc: 'Learn blockchain technology through hands-on experience with comprehensive guides, tutorials, and 24/7 community support.'
                    }
                  ];

                  valueProps.forEach(prop => {
                    checkPageBreak(20);
                    doc.setFontSize(11);
                    doc.setFont('helvetica', 'bold');
                    doc.text(prop.title, marginLeft + 5, yPos);
                    yPos += 6;
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(10);
                    const propLines = doc.splitTextToSize(prop.desc, contentWidth - 10);
                    doc.text(propLines, marginLeft + 5, yPos);
                    yPos += propLines.length * 5 + 8;
                  });

                  // ==================== INTRODUCTION ====================
                  yPos += 25;

                  addSectionHeader('2. INTRODUCTION TO KNRT MARKETPLACE', 1);
                  yPos += 5;

                  addSectionHeader('2.1 Platform Overview', 2);

                  addText('KNRT Marketplace is a comprehensive decentralized platform built on the Base blockchain that revolutionizes how individuals and businesses interact with NFTs (Non-Fungible Tokens). Whether you are an artist, collector, investor, or simply curious about blockchain technology, our platform provides everything needed to create, trade, and manage digital assets in a secure, transparent, and cost-effective manner.', 0, 11);
                  yPos += 8;

                  addText('The platform eliminates the complexity traditionally associated with blockchain technology, offering an intuitive interface that guides users through every step of their NFT journey. From creating your first digital wallet to minting your first NFT, every feature is designed with beginners in mind while maintaining the advanced capabilities that experienced users expect.', 0, 10);
                  yPos += 10;

                  addSectionHeader('2.2 Mission & Vision', 2);

                  addInfoBox(
                    'Our Mission',
                    'To democratize access to NFT technology and digital asset ownership, empowering creators and collectors worldwide with tools that are secure, affordable, and easy to use. We believe blockchain technology should be accessible to everyone, not just technical experts.',
                    193, 39, 45
                  );
                  yPos += 5;

                  addText('Our Vision: We envision a future where digital ownership is as natural and accessible as owning physical property. KNRT Marketplace aims to be the gateway through which mainstream users discover the transformative potential of blockchain technology and NFTs.', 0, 10);
                  yPos += 10;

                  addSectionHeader('Core Principles', 2);

                  const principles = [
                    {
                      title: 'Accessibility First',
                      desc: 'Every feature is designed to be understood and used by someone with zero blockchain experience. We provide comprehensive guides, tooltips, and support at every step.'
                    },
                    {
                      title: 'Transparency',
                      desc: 'All fees, transaction costs, and processes are clearly explained before you commit. No hidden charges, no surprises.'
                    },
                    {
                      title: 'Security',
                      desc: 'Your assets are protected by audited smart contracts and industry-leading security practices. We never have access to your private keys or funds.'
                    },
                    {
                      title: 'Innovation',
                      desc: 'We continuously develop new features like NFT rentals, rights delegation, and community governance to maximize value for our users.'
                    },
                    {
                      title: 'Community-Driven',
                      desc: 'Our platform evolves based on user feedback and community needs. We are building this together.'
                    }
                  ];

                  principles.forEach(principle => {
                    checkPageBreak(18);
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(11);
                    doc.setTextColor(193, 39, 45);
                    doc.text('• ' + principle.title + ':', marginLeft, yPos);
                    yPos += 6;
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(10);
                    doc.setTextColor(51, 51, 51);
                    const descLines = doc.splitTextToSize(principle.desc, contentWidth - 10);
                    doc.text(descLines, marginLeft + 5, yPos);
                    yPos += descLines.length * 5 + 6;
                  });

                  // ==================== TECHNICAL ARCHITECTURE ====================
                  yPos += 25;

                  addSectionHeader('3. TECHNICAL ARCHITECTURE', 1);
                  yPos += 5;

                  addSectionHeader('3.1 Base Layer 2 Network', 2);

                  addText('KNRT Marketplace is built on Base, a secure, low-cost, developer-friendly Ethereum Layer 2 (L2) blockchain developed by Coinbase. Base offers the security and decentralization of Ethereum at a fraction of the cost.', 0, 10);
                  yPos += 8;

                  addInfoBox(
                    'Why Base Network?',
                    'Base inherits the security of Ethereum while providing 100x lower transaction costs and 10x faster confirmation times. This makes NFT trading accessible to everyone, not just those who can afford high gas fees.',
                    209, 50, 56
                  );
                  yPos += 5;

                  const baseFeatures = [
                    'EVM Compatibility: Full compatibility with Ethereum tools and wallets',
                    'Low Fees: Average transaction cost of $0.01-$1.00',
                    'Fast Finality: 2-5 second transaction confirmation',
                    'Security: Protected by Ethereum\'s validator network',
                    'Scalability: Handles thousands of transactions per second',
                    'Developer Tools: Complete Ethereum development ecosystem'
                  ];

                  baseFeatures.forEach(feature => {
                    checkPageBreak(6);
                    doc.setFontSize(10);
                    const [title, desc] = feature.split(':');
                    doc.setFont('helvetica', 'bold');
                    doc.text('• ' + title + ':', marginLeft, yPos);
                    doc.setFont('helvetica', 'normal');
                    doc.text(desc, marginLeft + doc.getTextWidth('• ' + title + ': '), yPos);
                    yPos += 6;
                  });
                  yPos += 8;

                  addSectionHeader('3.2 Smart Contract Infrastructure', 2);

                  addText('All marketplace operations are governed by immutable smart contracts deployed on the Base blockchain. These self-executing programs ensure fairness, transparency, and security without requiring trusted intermediaries.', 0, 10);
                  yPos += 8;

                  const contracts = [
                    {
                      name: 'NFT Minting Contract (ERC-721)',
                      desc: 'Handles the creation of new NFTs. Each token receives a unique ID and is permanently associated with its creator. Includes metadata storage for name, description, image, and properties.'
                    },
                    {
                      name: 'Marketplace Trading Contract',
                      desc: 'Manages buy/sell operations. Ensures atomic swaps (simultaneous exchange of NFT and payment), preventing partial transactions. Automatically enforces pricing and ownership transfers.'
                    },
                    {
                      name: 'Rental System Contract',
                      desc: 'Enables time-based NFT rentals. Automatically returns NFTs to owners after rental periods expire. Distributes rental payments and handles deposit returns.'
                    },
                    {
                      name: 'Rights Delegation Contract',
                      desc: 'Allows NFT owners to delegate governance rights or utility access without transferring ownership. Revocable at any time by the owner.'
                    },
                    {
                      name: 'Token Swap Contract (DEX)',
                      desc: 'Facilitates trustless ETH-to-KNRT conversions using automated market maker (AMM) algorithms. No intermediary custody of funds.'
                    }
                  ];

                  contracts.forEach(contract => {
                    checkPageBreak(18);
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(10);
                    doc.setTextColor(193, 39, 45);
                    doc.text('▸ ' + contract.name, marginLeft, yPos);
                    yPos += 6;
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(51, 51, 51);
                    const contractLines = doc.splitTextToSize(contract.desc, contentWidth - 10);
                    doc.text(contractLines, marginLeft + 5, yPos);
                    yPos += contractLines.length * 5 + 6;
                  });
                  yPos += 5;

                  addSectionHeader('3.3 Token Economy (KNRT)', 2);

                  addText('KNRT is the native utility token of KNRT Marketplace, following the ERC-20 standard. It serves as the primary medium of exchange for all marketplace transactions.', 0, 10);
                  yPos += 8;

                  const tokenomics = [
                    { label: 'Token Name:', value: 'KNRT Token' },
                    { label: 'Token Standard:', value: 'ERC-20 (Ethereum Compatible)' },
                    { label: 'Blockchain:', value: 'Base Network (Chain ID: 8453)' },
                    { label: 'Primary Use:', value: 'Marketplace transactions, staking, governance' },
                    { label: 'Acquisition:', value: 'DEX swap (ETH → KNRT) or external exchanges' },
                    { label: 'Liquidity:', value: 'Always convertible back to ETH' }
                  ];

                  tokenomics.forEach(item => {
                    checkPageBreak(6);
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(10);
                    doc.text(item.label, marginLeft, yPos);
                    doc.setFont('helvetica', 'normal');
                    doc.text(item.value, marginLeft + 50, yPos);
                    yPos += 6;
                  });
                  yPos += 8;

                  addInfoBox(
                    'Why Use KNRT Instead of ETH?',
                    'KNRT tokens enable faster settlements, predictable pricing, and simplified accounting. Users always maintain the option to swap back to ETH at any time through the built-in DEX, ensuring liquidity and flexibility.',
                    51, 51, 51
                  );

                  // ==================== CORE FEATURES ====================
                  yPos += 25;

                  addSectionHeader('4. CORE FEATURES & FUNCTIONALITY', 1);
                  yPos += 5;

                  addSectionHeader('4.1 NFT Creation & Minting', 2);

                  addText('The NFT creation process on KNRT Marketplace is designed to be straightforward and accessible, even for first-time creators. Our minting system supports all common file formats and provides comprehensive metadata management with specialized templates for different asset types.', 0, 10);
                  yPos += 10;

                  addSectionHeader('Advanced Tokenization Templates', 2);
                  addText('KNRT Marketplace offers specialized templates for different types of digital and real-world assets, making tokenization accessible for various industries:', 0, 10);
                  yPos += 8;

                  // Template 1: IoT Sensor
                  checkPageBreak(35);
                  doc.setFillColor(0, 149, 233);
                  doc.roundedRect(marginLeft, yPos, contentWidth, 3, 1, 1, 'F');
                  yPos += 8;
                  doc.setFontSize(12);
                  doc.setFont('helvetica', 'bold');
                  doc.setTextColor(0, 149, 233);
                  doc.text('[IoT] Sensor Tokenization', marginLeft, yPos);
                  yPos += 7;
                  doc.setFontSize(10);
                  doc.setFont('helvetica', 'normal');
                  doc.setTextColor(51, 51, 51);
                  addText('Tokenize IoT devices, sensors, and continuous telemetry data streams. Perfect for agriculture, smart cities, and industrial monitoring. Includes sensor ID, type, readings, timestamps, geolocation, network details, and SLA guarantees.', 0, 10);
                  yPos += 3;
                  doc.setFont('helvetica', 'italic');
                  doc.setFontSize(9);
                  doc.setTextColor(100, 100, 100);
                  doc.text('Use Cases: Agricultural sensors, weather stations, industrial equipment monitoring, smart meters', marginLeft, yPos);
                  yPos += 10;

                  // Template 2: Map Cells (IMAGE BASED) - DESTACADO
                  checkPageBreak(80);
                  const mapCellsBoxStartY = yPos;
                  const boxPadding1 = 6;
                  const boxInnerWidth1 = contentWidth - (boxPadding1 * 2);

                  // Calculate box content first
                  const mapCellsUses = [
                    '* Vineyard parcels: Tokenize grape-growing sections',
                    '* Agricultural land: Divide farmland into investable plots',
                    '* Solar farms: Fractional ownership of solar panels',
                    '* Real estate: Tokenize building sections or parking',
                    '* Forest conservation: Sponsor forest quadrants',
                    '* Billboard advertising: Rent billboard space sections'
                  ];

                  const desc1Text = 'Upload an aerial image or map and divide it into a grid of tokenizable cells. Each cell becomes an independent NFT that can be bought, sold, or rented separately. Perfect for fractional ownership of large assets.';
                  const howItWorks1 = 'How it works: Upload your image, define grid dimensions (e.g., 8x12), select which cells are available for tokenization. Each cell records its position, size, and relationship to the whole asset.';

                  // Ensure wrapping uses the same font/size used for rendering
                  doc.setFontSize(10);
                  doc.setFont('helvetica', 'bold');
                  const desc1Lines = doc.splitTextToSize(desc1Text, boxInnerWidth1 - 8);
                  doc.setFont('helvetica', 'normal');
                  doc.setFontSize(9);
                  const howItWorksLines = doc.splitTextToSize(howItWorks1, boxInnerWidth1 - 8);

                  const boxHeight1 = boxPadding1 + 8 + (desc1Lines.length * 5) + 5 + (howItWorksLines.length * 5) + 5 + 5 + (mapCellsUses.length * 5) + boxPadding1;

                  // Draw blue box (professional color)
                  doc.setFillColor(37, 99, 235); // Blue 600
                  doc.roundedRect(marginLeft, mapCellsBoxStartY, contentWidth, boxHeight1, 3, 3, 'F');

                  // Draw all content in white
                  doc.setTextColor(255, 255, 255);
                  let mapCellsTempY = mapCellsBoxStartY + boxPadding1 + 6;

                  doc.setFontSize(12);
                  doc.setFont('helvetica', 'bold');
                  doc.text('[MAP] TOKENIZED IMAGE MAP (CELLS)', marginLeft + boxPadding1, mapCellsTempY);
                  mapCellsTempY += 8;

                  doc.setFontSize(10);
                  doc.setFont('helvetica', 'bold');
                  doc.text(desc1Lines, marginLeft + boxPadding1, mapCellsTempY);
                  mapCellsTempY += desc1Lines.length * 5 + 5;

                  doc.setFont('helvetica', 'normal');
                  doc.setFontSize(9);
                  doc.text(howItWorksLines, marginLeft + boxPadding1, mapCellsTempY);
                  mapCellsTempY += howItWorksLines.length * 5 + 5;

                  doc.setFont('helvetica', 'bold');
                  doc.setFontSize(10);
                  doc.text('Real-World Applications:', marginLeft + boxPadding1, mapCellsTempY);
                  mapCellsTempY += 5;

                  doc.setFont('helvetica', 'normal');
                  doc.setFontSize(9);
                  mapCellsUses.forEach(use => {
                    const useLines = doc.splitTextToSize(use, boxInnerWidth1 - 5);
                    doc.text(useLines, marginLeft + boxPadding1 + 3, mapCellsTempY);
                    mapCellsTempY += useLines.length * 5;
                  });

                  yPos = mapCellsBoxStartY + boxHeight1 + 15;
                  doc.setTextColor(51, 51, 51);

                  // Template 3: Live Map (LEAFLET) - DESTACADO
                  checkPageBreak(80);
                  const liveMapBoxStartY = yPos;
                  const boxPadding2 = 6;
                  const boxInnerWidth2 = contentWidth - (boxPadding2 * 2);

                  // Calculate box content first
                  const liveMapUses = [
                    '* Property tokenization without aerial photography',
                    '* Dynamic location-based services',
                    '* Delivery zones and service areas',
                    '* Event venue sections (stadiums, concert halls)',
                    '* Geofenced exclusive content access',
                    '* Territory rights for franchise businesses'
                  ];

                  const desc2Text = 'No image upload needed! Use real-time interactive maps (Leaflet + OpenStreetMap) to select and tokenize geographic areas with live satellite imagery. Draw boundaries directly on the map.';
                  const features2 = 'Advanced Features: Search any address globally, view satellite/street map layers, define tokenization boundaries, automatic coordinate capture, real-time area calculation, geolocation privacy controls.';

                  // Match wrapping fonts to rendering to avoid overflow
                  doc.setFontSize(10);
                  doc.setFont('helvetica', 'bold');
                  const desc2Lines = doc.splitTextToSize(desc2Text, boxInnerWidth2 - 8);
                  doc.setFont('helvetica', 'normal');
                  doc.setFontSize(9);
                  const featuresLines = doc.splitTextToSize(features2, boxInnerWidth2 - 8);

                  const boxHeight2 = boxPadding2 + 8 + (desc2Lines.length * 5) + 5 + (featuresLines.length * 5) + 5 + 5 + (liveMapUses.length * 5) + boxPadding2;

                  // Draw green box (keep green as it's professional)
                  doc.setFillColor(16, 185, 129); // Emerald 500
                  doc.roundedRect(marginLeft, liveMapBoxStartY, contentWidth, boxHeight2, 3, 3, 'F');

                  // Draw all content in white
                  doc.setTextColor(255, 255, 255);
                  let liveMapTempY = liveMapBoxStartY + boxPadding2 + 6;

                  doc.setFontSize(12);
                  doc.setFont('helvetica', 'bold');
                  doc.text('[LIVE] INTERACTIVE MAP TOKENIZATION', marginLeft + boxPadding2, liveMapTempY);
                  liveMapTempY += 8;

                  doc.setFontSize(10);
                  doc.setFont('helvetica', 'bold');
                  doc.text(desc2Lines, marginLeft + boxPadding2, liveMapTempY);
                  liveMapTempY += desc2Lines.length * 5 + 5;

                  doc.setFont('helvetica', 'normal');
                  doc.setFontSize(9);
                  doc.text(featuresLines, marginLeft + boxPadding2, liveMapTempY);
                  liveMapTempY += featuresLines.length * 5 + 5;

                  doc.setFont('helvetica', 'bold');
                  doc.setFontSize(10);
                  doc.text('Perfect For:', marginLeft + boxPadding2, liveMapTempY);
                  liveMapTempY += 5;

                  doc.setFont('helvetica', 'normal');
                  doc.setFontSize(9);
                  liveMapUses.forEach(use => {
                    const useLines = doc.splitTextToSize(use, boxInnerWidth2 - 5);
                    doc.text(useLines, marginLeft + boxPadding2 + 3, liveMapTempY);
                    liveMapTempY += useLines.length * 5;
                  });

                  yPos = liveMapBoxStartY + boxHeight2 + 15;
                  doc.setTextColor(51, 51, 51);

                  // Template 4: Real Estate Basic
                  checkPageBreak(30);
                  doc.setFillColor(168, 85, 247);
                  doc.roundedRect(marginLeft, yPos, contentWidth, 3, 1, 1, 'F');
                  yPos += 8;
                  doc.setFontSize(12);
                  doc.setFont('helvetica', 'bold');
                  doc.setTextColor(168, 85, 247);
                  doc.text('[PROPERTY] Basic Real Estate', marginLeft, yPos);
                  yPos += 7;
                  doc.setFontSize(10);
                  doc.setFont('helvetica', 'normal');
                  doc.setTextColor(51, 51, 51);
                  addText('Simple residential property tokenization with essential details: property type, city, bedrooms, bathrooms, and area. Ideal for apartments, houses, and condos.', 0, 10);
                  yPos += 10;

                  // Template 5: Real Estate Premium
                  checkPageBreak(30);
                  doc.setFillColor(250, 204, 21);
                  doc.roundedRect(marginLeft, yPos, contentWidth, 3, 1, 1, 'F');
                  yPos += 8;
                  doc.setFontSize(12);
                  doc.setFont('helvetica', 'bold');
                  doc.setTextColor(217, 119, 6);
                  doc.text('[PREMIUM] Property (Luxury Real Estate)', marginLeft, yPos);
                  yPos += 7;
                  doc.setFontSize(10);
                  doc.setFont('helvetica', 'normal');
                  doc.setTextColor(51, 51, 51);
                  addText('Comprehensive property tokenization including furnished status, parking spaces, construction year, and premium amenities. For luxury properties and commercial real estate.', 0, 10);
                  yPos += 10;

                  // Template 6: Membership
                  checkPageBreak(30);
                  doc.setFillColor(245, 158, 11);
                  doc.roundedRect(marginLeft, yPos, contentWidth, 3, 1, 1, 'F');
                  yPos += 8;
                  doc.setFontSize(12);
                  doc.setFont('helvetica', 'bold');
                  doc.setTextColor(245, 158, 11);
                  doc.text('[MEMBERSHIP] Access Passes & Subscriptions', marginLeft, yPos);
                  yPos += 7;
                  doc.setFontSize(10);
                  doc.setFont('helvetica', 'normal');
                  doc.setTextColor(51, 51, 51);
                  addText('Tokenize memberships, VIP access, subscription benefits, and exclusive perks. Includes tier levels, benefit descriptions, and expiration dates. Perfect for clubs, gyms, and subscription services.', 0, 10);
                  yPos += 10;

                  // Template 7: Artwork
                  checkPageBreak(30);
                  doc.setFillColor(239, 68, 68);
                  doc.roundedRect(marginLeft, yPos, contentWidth, 3, 1, 1, 'F');
                  yPos += 8;
                  doc.setFontSize(12);
                  doc.setFont('helvetica', 'bold');
                  doc.setTextColor(239, 68, 68);
                  doc.text('[ART] Digital Artwork & Collectibles', marginLeft, yPos);
                  yPos += 7;
                  doc.setFontSize(10);
                  doc.setFont('helvetica', 'normal');
                  doc.setTextColor(51, 51, 51);
                  addText('For digital artists: edition numbers, artist attribution, collection membership. Supports limited editions and provenance tracking for digital art collectibles.', 0, 10);
                  yPos += 10;

                  // Template 8: Gaming
                  checkPageBreak(30);
                  doc.setFillColor(99, 102, 241);
                  doc.roundedRect(marginLeft, yPos, contentWidth, 3, 1, 1, 'F');
                  yPos += 8;
                  doc.setFontSize(12);
                  doc.setFont('helvetica', 'bold');
                  doc.setTextColor(99, 102, 241);
                  doc.text('[GAMING] Characters & In-Game Items', marginLeft, yPos);
                  yPos += 7;
                  doc.setFontSize(10);
                  doc.setFont('helvetica', 'normal');
                  doc.setTextColor(51, 51, 51);
                  addText('Gaming NFTs with character classes, rarity tiers, and power stats. Perfect for play-to-earn games, metaverse avatars, and gaming collectibles.', 0, 10);
                  yPos += 12;

                  addInfoBox(
                    'Pro Tip: Custom Attributes',
                    'All templates are fully customizable! You can add up to 20 additional attributes to any template, making them perfect for unique use cases. Combine templates or create hybrid tokenization strategies.',
                    193, 39, 45
                  );
                  yPos += 8;

                  addSectionHeader('Standard Minting Process', 2);
                  const mintingSteps = [
                    '1. Select Your Template: Choose from 8+ specialized templates',
                    '2. Upload Digital File: Images, videos, documents (if applicable)',
                    '3. Configure Grid/Map: For spatial tokenization (cells/boundaries)',
                    '4. Add Metadata: Name, description, and custom properties',
                    '5. Set Royalties: Earn 0-10% on all future resales',
                    '6. Review & Mint: Confirm details and pay gas fee ($0.50-$2.00)',
                    '7. Blockchain Confirmation: Your NFT is permanently recorded'
                  ];

                  mintingSteps.forEach(step => {
                    checkPageBreak(6);
                    doc.setFontSize(10);
                    doc.text(step, marginLeft, yPos);
                    yPos += 6;
                  });
                  yPos += 8;

                  addInfoBox(
                    'Pro Tip: Royalties',
                    'Set up royalties (2-10% recommended) to earn passive income every time your NFT is resold on the secondary market. This is automatically enforced by the smart contract.',
                    193, 39, 45
                  );
                  yPos += 5;

                  addSectionHeader('4.2 Marketplace Trading', 2);

                  addText('The KNRT Marketplace provides a secure, transparent environment for buying and selling NFTs. All transactions are protected by smart contracts and recorded permanently on the blockchain.', 0, 10);
                  yPos += 8;

                  doc.setFont('helvetica', 'bold');
                  doc.setFontSize(11);
                  doc.setTextColor(193, 39, 45);
                  doc.text('Buying NFTs:', marginLeft, yPos);
                  yPos += 6;
                  doc.setFont('helvetica', 'normal');
                  doc.setFontSize(10);
                  doc.setTextColor(51, 51, 51);

                  const buyingSteps = [
                    '• Browse the marketplace or search for specific NFTs',
                    '• View detailed information: price, rarity, ownership history',
                    '• Click "Buy Now" and confirm the transaction',
                    '• The NFT is instantly transferred to your wallet',
                    '• Original owner receives payment automatically'
                  ];

                  buyingSteps.forEach(step => {
                    checkPageBreak(6);
                    doc.text(step, marginLeft + 5, yPos);
                    yPos += 6;
                  });
                  yPos += 8;

                  doc.setFont('helvetica', 'bold');
                  doc.setFontSize(11);
                  doc.setTextColor(193, 39, 45);
                  doc.text('Selling NFTs:', marginLeft, yPos);
                  yPos += 6;
                  doc.setFont('helvetica', 'normal');
                  doc.setFontSize(10);
                  doc.setTextColor(51, 51, 51);

                  const sellingSteps = [
                    '• Navigate to "My NFTs" in your profile',
                    '• Select the NFT you want to sell',
                    '• Set your asking price in KNRT tokens',
                    '• Approve the listing (small gas fee)',
                    '• Your NFT appears in the marketplace instantly'
                  ];

                  sellingSteps.forEach(step => {
                    checkPageBreak(6);
                    doc.text(step, marginLeft + 5, yPos);
                    yPos += 6;
                  });

                  // How It Works Section
                  checkPageBreak(60);
                  addSectionHeader('How KNRT Marketplace Works', 1);

                  addText('KNRT Marketplace operates on the Base blockchain (a Layer 2 solution built on Ethereum), providing fast transactions and low fees. Here is a complete overview of how each component works:', 0, 11);
                  yPos += 12;

                  // The Workflow
                  checkPageBreak(40);
                  addSectionHeader('Complete User Workflow', 2);

                  const workflowSteps = [
                    {
                      step: 'Step 1: Wallet Connection',
                      details: 'Users connect their MetaMask wallet to the platform. This establishes a secure connection between your digital wallet and the marketplace. Your wallet address serves as your unique identifier and stores all your NFTs and tokens.'
                    },
                    {
                      step: 'Step 2: Network Configuration',
                      details: 'The platform automatically prompts you to switch to the Base network (Chain ID: 8453). Base offers significantly lower gas fees (typically $0.01-$0.50) compared to Ethereum mainnet, making transactions affordable for everyone.'
                    },
                    {
                      step: 'Step 3: Get ETH on Base',
                      details: 'You need ETH on the Base network to pay for transaction fees (gas). You can bridge ETH from Ethereum mainnet using the official Base bridge at bridge.base.org, or purchase ETH directly on Base through exchanges like Coinbase.'
                    },
                    {
                      step: 'Step 4: Acquire KNRT Tokens',
                      details: 'KNRT is the native marketplace currency. Go to the Swap section and exchange your ETH for KNRT tokens. The swap uses an automated market maker (AMM) to provide instant, fair-priced conversions. KNRT tokens are required for all marketplace transactions.'
                    },
                    {
                      step: 'Step 5: Choose Your Action',
                      details: 'Now you are ready to participate in the marketplace. You can: Create NFTs (mint), Browse and buy NFTs from other users, List your NFTs for sale, Rent out your NFTs for passive income, Transfer rights/control temporarily, or Manage your portfolio.'
                    }
                  ];

                  workflowSteps.forEach((item, index) => {
                    checkPageBreak(35);
                    doc.setFillColor(240, 240, 240);
                    doc.rect(marginLeft - 3, yPos - 2, contentWidth + 6, 8, 'F');
                    doc.setFontSize(11);
                    doc.setFont('helvetica', 'bold');
                    doc.text(item.step, marginLeft, yPos + 3);
                    yPos += 10;
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'normal');
                    const detailLines = doc.splitTextToSize(item.details, contentWidth - 5);
                    doc.text(detailLines, marginLeft, yPos);
                    yPos += detailLines.length * 5 + 10;
                  });

                  // Basic Concepts
                  checkPageBreak(50);
                  addSectionHeader('Essential Blockchain Concepts', 1);

                  const concepts = [
                    {
                      title: 'NFT (Non-Fungible Token)',
                      text: 'A unique digital certificate of ownership recorded on the blockchain. Unlike cryptocurrencies (fungible tokens), each NFT is unique and cannot be exchanged 1:1 with another. NFTs can represent art, music, videos, virtual real estate, game items, or any digital asset. Ownership and transaction history are permanently recorded and publicly verifiable.'
                    },
                    {
                      title: 'Digital Wallet (MetaMask)',
                      text: 'Your personal cryptocurrency wallet that stores your private keys, NFTs, and tokens. Think of it as a digital bank account that only you control. No central authority can freeze or access your wallet. You receive a 12-24 word recovery phrase during setup - this is the master key to your wallet and must be kept absolutely secure.'
                    },
                    {
                      title: 'KNRT Token (ERC-20)',
                      text: 'The primary currency of KNRT Marketplace. It is an ERC-20 token (standard Ethereum token format) that facilitates all marketplace transactions. Using KNRT instead of ETH directly provides faster transactions, predictable pricing, and lower complexity. You can always swap KNRT back to ETH when needed.'
                    },
                    {
                      title: 'Gas Fees',
                      text: 'Network fees paid to blockchain validators for processing your transactions. On Base network, gas fees are extremely low (typically $0.01-$1.00) compared to Ethereum mainnet. These fees vary based on network congestion and transaction complexity. Gas fees are paid in ETH, which is why you need some ETH even when using KNRT tokens.'
                    },
                    {
                      title: 'Blockchain Technology',
                      text: 'A decentralized, immutable digital ledger that records all transactions across a network of computers. Once data is recorded on the blockchain, it cannot be altered or deleted. This ensures transparency, security, and trust without requiring intermediaries. Base blockchain is a Layer 2 solution built on Ethereum, providing the same security with lower costs.'
                    },
                    {
                      title: 'Minting (NFT Creation)',
                      text: 'The process of creating a new NFT and recording it on the blockchain. When you mint an NFT, you upload your digital file, add metadata (name, description, properties), and the smart contract creates a unique token ID. This token is permanently associated with your wallet address as the creator. Minting requires a small gas fee.'
                    },
                    {
                      title: 'Smart Contracts',
                      text: 'Self-executing programs on the blockchain that automatically enforce agreements. KNRT Marketplace uses smart contracts for all transactions: minting, buying, selling, renting, and rights transfers. These contracts are immutable, meaning once deployed, their rules cannot be changed. This ensures fairness and eliminates the need for trusted intermediaries.'
                    },
                    {
                      title: 'Base Network (Layer 2)',
                      text: 'A Layer 2 blockchain built by Coinbase on top of Ethereum. It inherits Ethereum security while providing significantly faster and cheaper transactions. Base is fully EVM-compatible, meaning all Ethereum tools and wallets work seamlessly. Average transaction costs are 100x cheaper than Ethereum mainnet.'
                    }
                  ];

                  concepts.forEach(concept => {
                    checkPageBreak(30);
                    doc.setFontSize(12);
                    doc.setFont('helvetica', 'bold');
                    doc.text(concept.title, marginLeft, yPos);
                    yPos += 7;
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'normal');
                    const conceptLines = doc.splitTextToSize(concept.text, contentWidth);
                    doc.text(conceptLines, marginLeft, yPos);
                    yPos += conceptLines.length * 5 + 8;
                  });

                  // Detailed Marketplace Features
                  checkPageBreak(50);
                  addSectionHeader('Marketplace Features In-Depth', 1);

                  // Minting Feature
                  checkPageBreak(40);
                  doc.setFontSize(14);
                  doc.setFont('helvetica', 'bold');
                  doc.setTextColor(193, 39, 45);
                  doc.text('Creating NFTs (Minting)', marginLeft, yPos);
                  yPos += 8;
                  doc.setTextColor(0, 0, 0);

                  doc.setFontSize(10);
                  doc.setFont('helvetica', 'normal');
                  const mintingDesc = 'The minting process on KNRT Marketplace is streamlined and user-friendly. Navigate to the "Mint" section where you will find an intuitive interface for creating your NFT. Upload your digital file (images, videos, audio, or documents). Add essential metadata including a title, description, and properties. Set attributes that make your NFT unique (rarity traits, edition numbers, etc.). Once you confirm, the platform deploys a smart contract transaction that permanently records your NFT on the Base blockchain. You retain full ownership and can list it for sale or rental immediately.';
                  const mintingLines = doc.splitTextToSize(mintingDesc, contentWidth);
                  doc.text(mintingLines, marginLeft, yPos);
                  yPos += mintingLines.length * 5 + 10;

                  // Buying Feature
                  checkPageBreak(35);
                  doc.setFontSize(14);
                  doc.setFont('helvetica', 'bold');
                  doc.setTextColor(193, 39, 45);
                  doc.text('Buying NFTs', marginLeft, yPos);
                  yPos += 8;
                  doc.setTextColor(0, 0, 0);

                  doc.setFontSize(10);
                  doc.setFont('helvetica', 'normal');
                  const buyingDesc = 'Browse the marketplace to discover NFTs listed for sale. Each NFT displays comprehensive information: current price in KNRT tokens, creator details, ownership history, and metadata. When you find an NFT you want to purchase, simply click "Buy Now". The platform automatically calculates the total cost including any applicable fees. Confirm the transaction in your MetaMask wallet. The smart contract instantly transfers the NFT to your wallet and sends KNRT payment to the seller. All transactions are recorded on the blockchain for complete transparency.';
                  const buyingLines = doc.splitTextToSize(buyingDesc, contentWidth);
                  doc.text(buyingLines, marginLeft, yPos);
                  yPos += buyingLines.length * 5 + 10;

                  // Selling Feature
                  checkPageBreak(35);
                  doc.setFontSize(14);
                  doc.setFont('helvetica', 'bold');
                  doc.setTextColor(193, 39, 45);
                  doc.text('Selling NFTs', marginLeft, yPos);
                  yPos += 8;
                  doc.setTextColor(0, 0, 0);

                  doc.setFontSize(10);
                  doc.setFont('helvetica', 'normal');
                  const sellingDesc = 'List your NFTs for sale with complete control over pricing. From your portfolio, select any NFT you own and click "List for Sale". Set your asking price in KNRT tokens. The NFT remains in your wallet but is locked from transfer until sold or delisted. When a buyer purchases your NFT, the smart contract automatically executes the transfer and deposits payment to your wallet minus any marketplace fees. You can adjust the price or delist your NFT at any time before sale.';
                  const sellingLines = doc.splitTextToSize(sellingDesc, contentWidth);
                  doc.text(sellingLines, marginLeft, yPos);
                  yPos += sellingLines.length * 5 + 10;

                  // Rental System
                  checkPageBreak(40);
                  doc.setFontSize(14);
                  doc.setFont('helvetica', 'bold');
                  doc.setTextColor(193, 39, 45);
                  doc.text('NFT Rental System', marginLeft, yPos);
                  yPos += 8;
                  doc.setTextColor(0, 0, 0);

                  doc.setFontSize(10);
                  doc.setFont('helvetica', 'normal');
                  const rentalDesc = 'Generate passive income by renting your NFTs. As an owner, list your NFT for rent specifying the rental price (in KNRT) and maximum rental duration. Renters can browse available NFTs and rent them for their specified period. During the rental period, the renter gains access to the NFT utilities, private metadata, and benefits without owning the underlying asset. The smart contract automatically enforces time limits - when the rental expires, all access reverts to the original owner. This creates new monetization opportunities for NFT holders while providing affordable access for users who want to use NFTs without purchasing them outright.';
                  const rentalLines = doc.splitTextToSize(rentalDesc, contentWidth);
                  doc.text(rentalLines, marginLeft, yPos);
                  yPos += rentalLines.length * 5 + 10;

                  // Rights Transfer
                  checkPageBreak(35);
                  doc.setFontSize(14);
                  doc.setFont('helvetica', 'bold');
                  doc.setTextColor(193, 39, 45);
                  doc.text('Rights Transfer (Delegation)', marginLeft, yPos);
                  yPos += 8;
                  doc.setTextColor(0, 0, 0);

                  doc.setFontSize(10);
                  doc.setFont('helvetica', 'normal');
                  const rightsDesc = 'The Rights Transfer feature allows NFT owners to delegate control rights to another wallet address without transferring ownership. This is particularly useful for gaming guilds (scholars can use NFTs owned by guilds), asset managers (delegates can manage portfolios), and collaborative projects. The owner sets the delegation terms and can revoke rights at any time. The delegate gains usage rights but cannot sell or transfer the NFT. This feature enables flexible asset utilization while maintaining security and ownership integrity.';
                  const rightsLines = doc.splitTextToSize(rightsDesc, contentWidth);
                  doc.text(rightsLines, marginLeft, yPos);
                  yPos += rightsLines.length * 5 + 10;

                  // Token Swap
                  checkPageBreak(30);
                  doc.setFontSize(14);
                  doc.setFont('helvetica', 'bold');
                  doc.setTextColor(193, 39, 45);
                  doc.text('Token Swapping (DEX)', marginLeft, yPos);
                  yPos += 8;
                  doc.setTextColor(0, 0, 0);

                  doc.setFontSize(10);
                  doc.setFont('helvetica', 'normal');
                  const swapDesc = 'The integrated decentralized exchange (DEX) allows seamless conversion between ETH and KNRT tokens. The swap interface displays real-time exchange rates calculated by an automated market maker (AMM) algorithm. Enter the amount you want to swap, review the conversion rate and estimated gas fees, then confirm the transaction. Swaps execute instantly with no intermediaries. You can swap in either direction: ETH to KNRT when you need marketplace currency, or KNRT to ETH when you want to cash out earnings.';
                  const swapLines = doc.splitTextToSize(swapDesc, contentWidth);
                  doc.text(swapLines, marginLeft, yPos);
                  yPos += swapLines.length * 5 + 12;

                  // Getting Started Whitepaper
                  checkPageBreak(50);
                  addSectionHeader('Step-by-Step Getting Started Whitepaper', 1);

                  // Step 1
                  checkPageBreak(45);
                  doc.setFillColor(240, 240, 240);
                  doc.rect(marginLeft - 3, yPos - 2, contentWidth + 6, 8, 'F');
                  doc.setFontSize(13);
                  doc.setFont('helvetica', 'bold');
                  doc.setTextColor(193, 39, 45);
                  doc.text('STEP 1: Install and Configure MetaMask', marginLeft, yPos + 3);
                  yPos += 12;
                  doc.setTextColor(0, 0, 0);

                  doc.setFontSize(10);
                  doc.setFont('helvetica', 'normal');
                  const step1Details = [
                    '1. Visit metamask.io from your web browser (Chrome, Firefox, Brave, or Edge)',
                    '2. Click "Download" and select your browser to install the extension',
                    '3. Once installed, click the MetaMask fox icon in your browser toolbar',
                    '4. Choose "Create a new wallet" (or import existing if you have one)',
                    '5. Create a strong password for the MetaMask extension',
                    '6. MetaMask will display your 12-word Secret Recovery Phrase',
                    '7. CRITICAL: Write down this phrase on paper and store it safely offline',
                    '8. Never share this phrase with anyone - it is the master key to your wallet',
                    '9. Confirm your recovery phrase by selecting words in the correct order',
                    '10. Your wallet is now created with a unique Ethereum address'
                  ];
                  step1Details.forEach(detail => {
                    checkPageBreak(8);
                    doc.text(detail, marginLeft, yPos);
                    yPos += 5;
                  });
                  yPos += 8;

                  // Step 2
                  checkPageBreak(35);
                  doc.setFillColor(240, 240, 240);
                  doc.rect(marginLeft - 3, yPos - 2, contentWidth + 6, 8, 'F');
                  doc.setFontSize(13);
                  doc.setFont('helvetica', 'bold');
                  doc.setTextColor(193, 39, 45);
                  doc.text('STEP 2: Connect Wallet to KNRT Marketplace', marginLeft, yPos + 3);
                  yPos += 12;
                  doc.setTextColor(0, 0, 0);

                  doc.setFontSize(10);
                  doc.setFont('helvetica', 'normal');
                  const step2Details = [
                    '1. Navigate to the KNRT Marketplace website',
                    '2. Look for the "Connect Wallet" button (usually top-right corner)',
                    '3. Click "Connect Wallet" to open the wallet selection modal',
                    '4. Select "MetaMask" from the available wallet options',
                    '5. A MetaMask popup will appear requesting connection permission',
                    '6. Review the connection request details carefully',
                    '7. Click "Connect" in MetaMask to approve the connection',
                    '8. Your wallet address will now display on the marketplace',
                    '9. The marketplace can now read your wallet address and NFT holdings',
                    '10. You maintain full control - the marketplace cannot move your assets'
                  ];
                  step2Details.forEach(detail => {
                    checkPageBreak(8);
                    doc.text(detail, marginLeft, yPos);
                    yPos += 5;
                  });
                  yPos += 8;

                  // Step 3
                  checkPageBreak(40);
                  doc.setFillColor(240, 240, 240);
                  doc.rect(marginLeft - 3, yPos - 2, contentWidth + 6, 8, 'F');
                  doc.setFontSize(13);
                  doc.setFont('helvetica', 'bold');
                  doc.setTextColor(193, 39, 45);
                  doc.text('STEP 3: Switch to Base Network', marginLeft, yPos + 3);
                  yPos += 12;
                  doc.setTextColor(0, 0, 0);

                  doc.setFontSize(10);
                  doc.setFont('helvetica', 'normal');
                  const step3Details = [
                    '1. The marketplace will automatically detect you are not on Base network',
                    '2. A prompt will appear asking you to switch networks',
                    '3. Click "Switch Network" or "Add Network" in the notification',
                    '4. MetaMask will open with the Base network details pre-filled',
                    '5. Network Name: Base, Chain ID: 8453, RPC URL: (auto-configured)',
                    '6. Click "Approve" to add Base network to MetaMask',
                    '7. Then click "Switch Network" to change from Ethereum to Base',
                    '8. The MetaMask icon will confirm you are now on Base network',
                    '9. All subsequent transactions will now occur on Base',
                    '10. You can always switch back to Ethereum or other networks in MetaMask'
                  ];
                  step3Details.forEach(detail => {
                    checkPageBreak(8);
                    doc.text(detail, marginLeft, yPos);
                    yPos += 5;
                  });
                  yPos += 8;

                  // Step 4
                  checkPageBreak(40);
                  doc.setFillColor(240, 240, 240);
                  doc.rect(marginLeft - 3, yPos - 2, contentWidth + 6, 8, 'F');
                  doc.setFontSize(13);
                  doc.setFont('helvetica', 'bold');
                  doc.setTextColor(193, 39, 45);
                  doc.text('STEP 4: Get ETH on Base Network', marginLeft, yPos + 3);
                  yPos += 12;
                  doc.setTextColor(0, 0, 0);

                  doc.setFontSize(10);
                  doc.setFont('helvetica', 'normal');
                  const baseETHText = 'You need ETH on Base network to pay gas fees for transactions. There are two main methods:';
                  const baseETHLines = doc.splitTextToSize(baseETHText, contentWidth);
                  doc.text(baseETHLines, marginLeft, yPos);
                  yPos += baseETHLines.length * 5 + 8;

                  doc.setFont('helvetica', 'bold');
                  doc.text('Option A: Bridge from Ethereum Mainnet', marginLeft, yPos);
                  yPos += 6;
                  doc.setFont('helvetica', 'normal');
                  const bridgeSteps = [
                    '1. Visit the official Base bridge: bridge.base.org',
                    '2. Connect your MetaMask wallet to the bridge',
                    '3. Ensure you are on Ethereum mainnet with ETH in your wallet',
                    '4. Enter the amount of ETH you want to bridge to Base',
                    '5. Review the fees (mainnet gas + bridge fee)',
                    '6. Click "Bridge" and confirm the transaction in MetaMask',
                    '7. Wait 5-10 minutes for the bridge to complete',
                    '8. Your ETH will appear in your wallet on Base network'
                  ];
                  bridgeSteps.forEach(step => {
                    checkPageBreak(8);
                    doc.text(step, marginLeft, yPos);
                    yPos += 5;
                  });
                  yPos += 8;

                  checkPageBreak(25);
                  doc.setFont('helvetica', 'bold');
                  doc.text('Option B: Purchase ETH directly on Base', marginLeft, yPos);
                  yPos += 6;
                  doc.setFont('helvetica', 'normal');
                  const purchaseText = 'Use a centralized exchange that supports Base network withdrawals (e.g., Coinbase, Binance). Purchase ETH and when withdrawing, select "Base" as the destination network. The ETH will arrive directly on Base network in your wallet.';
                  const purchaseLines = doc.splitTextToSize(purchaseText, contentWidth);
                  doc.text(purchaseLines, marginLeft, yPos);
                  yPos += purchaseLines.length * 5 + 10;

                  // Step 5
                  checkPageBreak(35);
                  doc.setFillColor(240, 240, 240);
                  doc.rect(marginLeft - 3, yPos - 2, contentWidth + 6, 8, 'F');
                  doc.setFontSize(13);
                  doc.setFont('helvetica', 'bold');
                  doc.setTextColor(193, 39, 45);
                  doc.text('STEP 5: Swap ETH for KNRT Tokens', marginLeft, yPos + 3);
                  yPos += 12;
                  doc.setTextColor(0, 0, 0);

                  doc.setFontSize(10);
                  doc.setFont('helvetica', 'normal');
                  const step5Details = [
                    '1. Navigate to the "Swap" section in KNRT Marketplace',
                    '2. Select ETH as the input token and KNRT as the output token',
                    '3. Enter the amount of ETH you want to swap',
                    '4. The interface displays how many KNRT tokens you will receive',
                    '5. Review the exchange rate and price impact',
                    '6. Check the estimated gas fee for the swap transaction',
                    '7. Click "Swap" when you are satisfied with the terms',
                    '8. MetaMask will open requesting transaction approval',
                    '9. Review the transaction details and gas fee',
                    '10. Click "Confirm" in MetaMask to execute the swap',
                    '11. Wait 10-30 seconds for transaction confirmation',
                    '12. Your KNRT tokens will appear in your wallet balance',
                    '13. You can now use KNRT to buy NFTs on the marketplace'
                  ];
                  step5Details.forEach(detail => {
                    checkPageBreak(8);
                    doc.text(detail, marginLeft, yPos);
                    yPos += 5;
                  });
                  yPos += 8;

                  // Security Best Practices
                  checkPageBreak(50);
                  addSectionHeader('Security Best Practices', 1);

                  const securityTips = [
                    {
                      title: 'NEVER Share Your Recovery Phrase',
                      desc: 'Your 12-24 word recovery phrase is the master key to your wallet. Anyone with this phrase has complete access to all your funds and NFTs. Never type it into websites, never share it in messages, never store it digitally. Write it on paper and store in a secure physical location. No legitimate service will ever ask for your recovery phrase.'
                    },
                    {
                      title: 'Verify Website URLs',
                      desc: 'Always check that you are on the correct website before connecting your wallet. Phishing sites often use similar-looking URLs to steal wallet credentials. Bookmark the official KNRT Marketplace URL and always access it through your bookmark.'
                    },
                    {
                      title: 'Review Transaction Details',
                      desc: 'Before confirming any transaction in MetaMask, carefully review all details: the recipient address, the amount being sent, the gas fee, and any smart contract interactions. If something looks suspicious, reject the transaction and investigate further.'
                    },
                    {
                      title: 'Use Hardware Wallets for Large Holdings',
                      desc: 'If you plan to hold significant value in NFTs or tokens, consider using a hardware wallet (Ledger, Trezor) for enhanced security. These devices keep your private keys offline and require physical confirmation for transactions.'
                    },
                    {
                      title: 'Keep Software Updated',
                      desc: 'Regularly update your MetaMask extension, web browser, and operating system. Security updates often patch vulnerabilities that could be exploited by attackers.'
                    }
                  ];

                  securityTips.forEach(tip => {
                    checkPageBreak(25);
                    doc.setFontSize(12);
                    doc.setFont('helvetica', 'bold');
                    doc.text(tip.title, marginLeft, yPos);
                    yPos += 7;
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'normal');
                    const tipLines = doc.splitTextToSize(tip.desc, contentWidth);
                    doc.text(tipLines, marginLeft, yPos);
                    yPos += tipLines.length * 5 + 8;
                  });

                  // FAQ
                  checkPageBreak(50);
                  addSectionHeader('Frequently Asked Questions', 1);

                  const faqs = [
                    {
                      q: 'Do I need blockchain or technical knowledge to use KNRT Marketplace?',
                      a: 'No. KNRT Marketplace is designed for complete beginners. This Whitepaper provides all the information you need to get started. The platform uses intuitive interfaces that abstract away blockchain complexity. You just need to follow the step-by-step instructions to install MetaMask, connect your wallet, and start trading NFTs.'
                    },
                    {
                      q: 'Is it safe to connect my wallet to KNRT Marketplace?',
                      a: 'Yes, it is safe when you follow security best practices. Wallet connection only gives the marketplace permission to view your public address and NFT holdings - it cannot move your assets without your explicit approval for each transaction. Always verify you are on the correct website URL, never share your recovery phrase with anyone, and carefully review all transaction requests in MetaMask before confirming.'
                    },
                    {
                      q: 'How much does it cost to use KNRT Marketplace?',
                      a: 'Browsing NFTs and exploring the marketplace is completely free. When you perform blockchain transactions (minting, buying, selling, renting), you pay gas fees to the Base network (typically $0.01-$1.00 per transaction). NFT prices are set by creators and sellers. There may be a small marketplace fee on sales (typically 1-2.5%). All fees are transparently displayed before you confirm transactions.'
                    },
                    {
                      q: 'What happens if I lose my MetaMask recovery phrase?',
                      a: 'You will permanently lose access to your wallet and all assets it contains (NFTs, KNRT tokens, ETH). There is absolutely no way to recover a wallet without the recovery phrase - not even MetaMask or KNRT Marketplace can help. This is why it is critical to write down your recovery phrase on paper during wallet setup and store it in a secure physical location. Consider using a safe, safety deposit box, or other secure storage.'
                    },
                    {
                      q: 'Are my NFTs really stored on the blockchain?',
                      a: 'Yes. When you mint or purchase an NFT, the ownership record is permanently inscribed on the Base blockchain. The NFT metadata (description, properties) and often a link to the media file are also recorded. You can verify your NFT ownership on blockchain explorers like BaseScan (basescan.org) using your wallet address or the NFT token ID. No one can alter or delete this record.'
                    },
                    {
                      q: 'How does NFT rental work on KNRT Marketplace?',
                      a: 'NFT rental allows owners to generate passive income while retaining ownership. The owner lists their NFT for rent, specifying the rental price (in KNRT) and maximum duration. A renter pays the rental fee and gains temporary access to the NFT for the specified period. Smart contracts automatically enforce the rental terms - when the time expires, all access rights revert to the original owner. The renter cannot sell, transfer, or permanently claim the NFT.'
                    },
                    {
                      q: 'What is the purpose of Rights Transfer (delegation)?',
                      a: 'Rights Transfer allows NFT owners to grant usage rights to another wallet address without transferring ownership. This is useful for gaming guilds (guild members can use NFTs owned by the guild leader), asset managers (professionals can manage your portfolio), and collaborative projects. The owner maintains full ownership and can revoke the delegation at any time. The delegate cannot sell or transfer the NFT - they can only use its utilities and benefits.'
                    },
                    {
                      q: 'Can I convert KNRT tokens back to ETH?',
                      a: 'Yes, absolutely. The Swap section works in both directions. You can swap ETH for KNRT when you need marketplace currency, or swap KNRT back to ETH when you want to cash out earnings or pay for gas fees. The process is instant and uses the same automated market maker (AMM) for fair pricing in both directions.'
                    },
                    {
                      q: 'Why do I need both ETH and KNRT tokens?',
                      a: 'ETH is required to pay gas fees for all blockchain transactions on the Base network. KNRT is the marketplace currency used for buying and selling NFTs. This dual-token system provides benefits: gas fees remain consistent in ETH (preventing volatility), marketplace transactions are faster and more predictable with KNRT, and you can easily swap between the two tokens as needed.'
                    },
                    {
                      q: 'What makes Base network better than Ethereum mainnet?',
                      a: 'Base is a Layer 2 solution that provides all the security of Ethereum with significantly better performance and costs. Transaction fees on Base are typically 100x cheaper than Ethereum mainnet ($0.01-$1 vs $5-$50). Transactions confirm faster (1-2 seconds vs 15+ seconds). Base is fully compatible with Ethereum tools like MetaMask. For users, this means affordable NFT transactions without compromising security.'
                    }
                  ];

                  faqs.forEach((faq, index) => {
                    checkPageBreak(35);
                    doc.setFillColor(245, 245, 245);
                    doc.rect(marginLeft - 3, yPos - 3, contentWidth + 6, 6, 'F');
                    doc.setFontSize(11);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(193, 39, 45);
                    doc.text(`Q${index + 1}: ${faq.q}`, marginLeft, yPos + 2);
                    yPos += 10;
                    doc.setTextColor(0, 0, 0);
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'normal');
                    const aLines = doc.splitTextToSize(faq.a, contentWidth);
                    doc.text(aLines, marginLeft, yPos);
                    yPos += aLines.length * 5 + 12;
                  });

                  // Additional Resources
                  checkPageBreak(40);
                  addSectionHeader('Additional Resources', 1);

                  const resources = [
                    { name: 'MetaMask Documentation', url: 'metamask.io/support' },
                    { name: 'Base Network Official Site', url: 'base.org' },
                    { name: 'Base Bridge', url: 'bridge.base.org' },
                    { name: 'BaseScan Block Explorer', url: 'basescan.org' },
                    { name: 'OpenSea NFT Marketplace', url: 'opensea.io' }
                  ];

                  addText('For additional learning and tools, explore these trusted resources:', 0, 11);
                  yPos += 5;

                  resources.forEach(resource => {
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'bold');
                    doc.text(`• ${resource.name}:`, marginLeft, yPos);
                    yPos += 6;
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(0, 0, 200);
                    doc.text(resource.url, marginLeft + 5, yPos);
                    doc.setTextColor(0, 0, 0);
                    yPos += 8;
                  });

                  // Conclusion
                  yPos += 10;
                  checkPageBreak(30);
                  doc.setFillColor(240, 240, 240);
                  doc.rect(marginLeft, yPos - 3, contentWidth, 45, 'F');
                  doc.setFontSize(14);
                  doc.setFont('helvetica', 'bold');
                  doc.setTextColor(193, 39, 45);
                  doc.text('Welcome to the Future of Digital Ownership', pageWidth / 2, yPos + 5, { align: 'center' });
                  yPos += 12;
                  doc.setTextColor(0, 0, 0);
                  doc.setFontSize(10);
                  doc.setFont('helvetica', 'normal');
                  const conclusion = 'KNRT Marketplace empowers you to participate in the NFT economy with confidence and ease. Whether you are creating, collecting, or investing in digital assets, our platform provides the tools and security you need. Start your journey today and discover the possibilities of blockchain technology.';
                  const conclusionLines = doc.splitTextToSize(conclusion, contentWidth - 10);
                  doc.text(conclusionLines, pageWidth / 2, yPos, { align: 'center' });

                  // Add final footer at the end of continuous page
                  yPos += 30;
                  doc.setFontSize(9);
                  doc.setTextColor(150, 150, 150);
                  doc.text('KNRT Marketplace - Complete Whitepaper', pageWidth / 2, yPos, { align: 'center' });
                  yPos += 5;
                  doc.text('© 2025 KNRT Marketplace. All rights reserved.', pageWidth / 2, yPos, { align: 'center' });

                  // Update maxYPos for final content
                  maxYPos = Math.max(maxYPos, yPos + 20);

                  // Save PDF
                  doc.save('KNRT-Marketplace-Complete-Whitepaper.pdf');
                })}
                class="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-sm text-white border-2 border-white rounded-2xl font-bold text-lg hover:bg-white/20 transition-all"
              >
                <LuDownload class="w-5 h-5" />
                Download Whitepaper
              </button>
              <a
                href={`${localeBase}/marketplace/`}
                class="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-sm text-white border-2 border-white rounded-2xl font-bold text-lg hover:bg-white/20 transition-all"
              >
                <LuShoppingCart class="w-5 h-5" />
                View Marketplace
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Navegación rápida */}
      <nav class="sticky top-20 z-10 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm" id="empezar">
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div class="flex overflow-x-auto py-4 gap-4 scrollbar-hide">
            <a href="#conceptos" class="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 whitespace-nowrap transition-colors">
              <LuLayers class="w-4 h-4" />
              Concepts
            </a>
            <a href="#wallet" class="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 whitespace-nowrap transition-colors">
              <LuWallet class="w-4 h-4" />
              1. Wallet
            </a>
            <a href="#tokens" class="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 whitespace-nowrap transition-colors">
              <LuCoins class="w-4 h-4" />
              2. Tokens
            </a>
            <a href="#mint" class="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 whitespace-nowrap transition-colors">
              <LuFileText class="w-4 h-4" />
              3. Create NFT
            </a>
            <a href="#buy" class="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 whitespace-nowrap transition-colors">
              <LuShoppingCart class="w-4 h-4" />
              4. Buy
            </a>
            <a href="#rent" class="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 whitespace-nowrap transition-colors">
              <LuHome class="w-4 h-4" />
              5. Rent
            </a>
            <a href="#rights" class="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 whitespace-nowrap transition-colors">
              <LuZap class="w-4 h-4" />
              6. Rights
            </a>
            <a href="#faq" class="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 whitespace-nowrap transition-colors">
              <LuHelpCircle class="w-4 h-4" />
              FAQ
            </a>
          </div>
        </div>
      </nav>

      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-12">
        {/* Resumen visual del flujo */}
        <section class="mb-16" id="conceptos">
          <div class="text-center mb-12">
            <div class="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-full text-amber-700 text-sm font-semibold mb-4">
              🧑‍🎓 Beginner-Friendly Guide
            </div>
            <h2 class="text-3xl sm:text-4xl font-bold text-gray-900">What is KNRT Marketplace?</h2>
            <p class="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
              Think of it like <strong>Amazon + Airbnb but for digital items</strong>. You can create, buy, sell
              and rent unique digital properties (NFTs) — and everything is secured on the blockchain
              so nobody can tamper with ownership.
            </p>
          </div>

          {/* ---- BEFORE YOU START (prereqs) ---- */}
          <div class="mb-12 bg-blue-50 border border-blue-200 rounded-2xl p-6 max-w-3xl mx-auto">
            <h3 class="text-lg font-bold text-blue-900 flex items-center gap-2 mb-4">
              <LuCheckCircle2 class="w-5 h-5 text-blue-600" />
              Before You Start — What You'll Need
            </h3>
            <ul class="space-y-3 text-sm text-blue-800">
              <li class="flex items-start gap-3">
                <span class="flex-shrink-0 w-6 h-6 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center text-xs font-bold">1</span>
                <span><strong>A browser</strong> — Chrome, Firefox, Brave or Edge on a computer or phone.</span>
              </li>
              <li class="flex items-start gap-3">
                <span class="flex-shrink-0 w-6 h-6 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center text-xs font-bold">2</span>
                <span><strong>MetaMask extension</strong> (free) — or simply register with your <strong>email</strong> and we create a wallet for you automatically!</span>
              </li>
              <li class="flex items-start gap-3">
                <span class="flex-shrink-0 w-6 h-6 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center text-xs font-bold">3</span>
                <span><strong>A tiny bit of ETH</strong> on the Base network — for transaction fees (usually less than $0.01). You can bridge it from Ethereum.</span>
              </li>
            </ul>
            <p class="text-xs text-blue-600 mt-4 italic">💡 Don't have MetaMask? No worries — choose "Email" when connecting and we handle everything for you.</p>
          </div>

          {/* APP FLOW DIAGRAM */}
          <div class="mb-16 p-8 bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden relative">
            <div class="absolute top-0 right-0 w-64 h-64 bg-red-50 rounded-full blur-3xl opacity-50 -mr-20 -mt-20"></div>
            <div class="absolute bottom-0 left-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-50 -ml-20 -mb-20"></div>

            <div class="relative z-10 text-center mb-8">
              <h3 class="text-2xl font-bold text-gray-900 flex items-center justify-center gap-2">
                <LuLayers class="w-6 h-6 text-[#c1272d]" />
                How KNRT Marketplace Works
              </h3>
              <p class="text-gray-500 mt-2">The complete ecosystem flow from creation to monetization.</p>
            </div>

            <div class="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-4">

              {/* Step 1: User/Creator */}
              <div class="flex flex-col items-center w-full lg:w-1/4">
                <div class="w-16 h-16 rounded-2xl bg-[#c1272d] text-white flex items-center justify-center shadow-lg shadow-red-200 mb-4 z-10 relative group hover:-translate-y-1 transition-transform">
                  <LuWallet class="w-8 h-8" />
                </div>
                <h4 class="font-bold text-gray-900 text-center">1. Connect Wallet</h4>
                <p class="text-xs text-center text-gray-500 mt-2 px-2">Web3 / Email login on Base L2</p>
              </div>

              {/* Arrow 1 */}
              <div class="hidden lg:flex flex-col items-center w-12 shrink-0 text-gray-300">
                <div class="h-0.5 w-full bg-gray-300 relative">
                  <div class="absolute right-0 top-1/2 -mt-1 w-2 h-2 border-t-2 border-r-2 border-gray-300 rotate-45"></div>
                </div>
              </div>
              <div class="flex lg:hidden flex-col items-center h-8 text-gray-300 py-2">
                <div class="w-0.5 h-full bg-gray-300 relative">
                  <div class="absolute bottom-0 left-1/2 -ml-1 w-2 h-2 border-b-2 border-r-2 border-gray-300 rotate-45"></div>
                </div>
              </div>

              {/* Step 2: Minting & Creation */}
              <div class="flex flex-col items-center w-full lg:w-1/4">
                <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-blue-200 mb-4 z-10 relative group hover:-translate-y-1 transition-transform">
                  <LuFileText class="w-8 h-8" />
                </div>
                <h4 class="font-bold text-gray-900 text-center">2. Tokenize (Mint)</h4>
                <p class="text-xs text-center text-gray-500 mt-2 px-2">Transform properties, art & IoT data into Dynamic NFTs</p>
              </div>

              {/* Arrow 2 */}
              <div class="hidden lg:flex flex-col items-center w-12 shrink-0 text-gray-300">
                <div class="h-0.5 w-full bg-gray-300 relative">
                  <div class="absolute right-0 top-1/2 -mt-1 w-2 h-2 border-t-2 border-r-2 border-gray-300 rotate-45"></div>
                </div>
              </div>
              <div class="flex lg:hidden flex-col items-center h-8 text-gray-300 py-2">
                <div class="w-0.5 h-full bg-gray-300 relative">
                  <div class="absolute bottom-0 left-1/2 -ml-1 w-2 h-2 border-b-2 border-r-2 border-gray-300 rotate-45"></div>
                </div>
              </div>

              {/* Step 3: Marketplace Ecosystem (Box) */}
              <div class="w-full lg:w-2/5 border-2 border-dashed border-[#c1272d]/30 rounded-2xl p-4 bg-red-50/50 relative mt-4 lg:mt-0">
                <div class="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-white px-3 py-1 text-xs font-bold text-[#c1272d] border border-[#c1272d]/30 rounded-full shadow-sm">
                  Marketplace Core Ecosystem
                </div>

                <div class="grid grid-cols-2 gap-3 mt-3">
                  <div class="bg-white rounded-xl p-3 shadow-sm flex flex-col items-center justify-center border border-gray-100 hover:border-green-300 hover:shadow-md transition-all group cursor-pointer">
                    <LuShoppingCart class="w-6 h-6 text-green-500 mb-2 group-hover:scale-110 transition-transform" />
                    <span class="text-sm font-bold text-gray-900">Buy / Sell</span>
                    <span class="text-[10px] text-gray-500 text-center mt-1 leading-tight">Trade diverse assets using KNRT tokens securely</span>
                  </div>

                  <div class="bg-white rounded-xl p-3 shadow-sm flex flex-col items-center justify-center border border-gray-100 hover:border-purple-300 hover:shadow-md transition-all group cursor-pointer">
                    <LuHome class="w-6 h-6 text-purple-500 mb-2 group-hover:scale-110 transition-transform" />
                    <span class="text-sm font-bold text-gray-900">Rentals</span>
                    <span class="text-[10px] text-gray-500 text-center mt-1 leading-tight">Lend your NFTs to generate passive yield</span>
                  </div>

                  <div class="bg-white rounded-xl p-3 shadow-sm flex flex-col items-center justify-center border border-gray-100 hover:border-orange-300 hover:shadow-md transition-all group cursor-pointer">
                    <LuZap class="w-6 h-6 text-orange-500 mb-2 group-hover:scale-110 transition-transform" />
                    <span class="text-sm font-bold text-gray-900">DeFi & DEX</span>
                    <span class="text-[10px] text-gray-500 text-center mt-1 leading-tight">Instant swaps ETH/KNRT via Uniswap V3</span>
                  </div>

                  <div class="bg-white rounded-xl p-3 shadow-sm flex flex-col items-center justify-center border border-gray-100 hover:border-pink-300 hover:shadow-md transition-all group cursor-pointer">
                    <LuShield class="w-6 h-6 text-pink-500 mb-2 group-hover:scale-110 transition-transform" />
                    <span class="text-sm font-bold text-gray-900">Rights</span>
                    <span class="text-[10px] text-gray-500 text-center mt-1 leading-tight">Delegate specific usage without transferring ownership</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
          {/* END APP FLOW DIAGRAM */}

          <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <div class="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-[#c1272d]/30 hover:shadow-lg transition-all">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-r from-[#c1272d] to-[#d13238] flex items-center justify-center mb-4">
                <LuFileText class="w-6 h-6 text-white" />
              </div>
              <h3 class="text-lg font-bold text-gray-900 mb-2">Create (Mint)</h3>
              <p class="text-sm text-gray-600">
                Turn your properties, art or ideas into unique and verifiable NFTs.
              </p>
            </div>

            <div class="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-[#c1272d]/30 hover:shadow-lg transition-all">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center mb-4">
                <LuShoppingCart class="w-6 h-6 text-white" />
              </div>
              <h3 class="text-lg font-bold text-gray-900 mb-2">Buy/Sell</h3>
              <p class="text-sm text-gray-600">
                Buy or sell NFTs securely using KNRT tokens.
              </p>
            </div>

            <div class="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-[#c1272d]/30 hover:shadow-lg transition-all">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-600 flex items-center justify-center mb-4">
                <LuHome class="w-6 h-6 text-white" />
              </div>
              <h3 class="text-lg font-bold text-gray-900 mb-2">Rent</h3>
              <p class="text-sm text-gray-600">
                Rent NFTs for periods of time and generate passive income.
              </p>
            </div>

            <div class="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-[#c1272d]/30 hover:shadow-lg transition-all">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center mb-4">
                <LuZap class="w-6 h-6 text-white" />
              </div>
              <h3 class="text-lg font-bold text-gray-900 mb-2">Temporary Rights</h3>
              <p class="text-sm text-gray-600">
                Transfer temporary control of an NFT without losing ownership.
              </p>
            </div>
          </div>

          {/* Conceptos clave */}
          <div class="bg-gradient-to-r from-[#c1272d]/5 to-[#d13238]/5 rounded-3xl p-8 border border-[#c1272d]/10 mb-10">
            <h3 class="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <LuBook class="w-7 h-7 text-[#c1272d]" />
              Basic Concepts — Explained Like You're 5
            </h3>
            <p class="text-sm text-gray-500 mb-6">No technical jargon. We promise.</p>
            <div class="grid md:grid-cols-2 gap-6">
              <div class="bg-white rounded-xl p-5 shadow-sm">
                <div class="flex items-start gap-3">
                  <div class="w-10 h-10 rounded-lg bg-[#c1272d]/10 flex items-center justify-center flex-shrink-0">
                    <LuFileText class="w-5 h-5 text-[#c1272d]" />
                  </div>
                  <div>
                    <h4 class="font-bold text-gray-900 mb-1">NFT</h4>
                    <p class="text-sm text-gray-600">
                      🏠 Imagine a <strong>digital deed</strong> that proves YOU own something — a piece of art, a house listing, a special membership. Nobody can fake it.
                    </p>
                  </div>
                </div>
              </div>

              <div class="bg-white rounded-xl p-5 shadow-sm">
                <div class="flex items-start gap-3">
                  <div class="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <LuWallet class="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 class="font-bold text-gray-900 mb-1">Wallet</h4>
                    <p class="text-sm text-gray-600">
                      👛 Your <strong>digital wallet</strong> — it stores your NFTs and tokens. Like a bank account but you're always in control. MetaMask or an email account.
                    </p>
                  </div>
                </div>
              </div>

              <div class="bg-white rounded-xl p-5 shadow-sm">
                <div class="flex items-start gap-3">
                  <div class="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                    <LuCoins class="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h4 class="font-bold text-gray-900 mb-1">KNRT Token</h4>
                    <p class="text-sm text-gray-600">
                      🪙 The <strong>currency of this platform</strong>. Think of it like arcade tokens — they have real value and you use them to buy, sell, and rent things here.
                    </p>
                  </div>
                </div>
              </div>

              <div class="bg-white rounded-xl p-5 shadow-sm">
                <div class="flex items-start gap-3">
                  <div class="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                    <LuZap class="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h4 class="font-bold text-gray-900 mb-1">Gas / Fees</h4>
                    <p class="text-sm text-gray-600">
                      ⛽ A <strong>tiny fee</strong> (usually less than $0.01) you pay when doing something on the blockchain. Like the postage for mailing a letter.
                    </p>
                  </div>
                </div>
              </div>

              <div class="bg-white rounded-xl p-5 shadow-sm">
                <div class="flex items-start gap-3">
                  <div class="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                    <LuShield class="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h4 class="font-bold text-gray-900 mb-1">Blockchain</h4>
                    <p class="text-sm text-gray-600">
                      🔗 A <strong>public, tamper-proof ledger</strong> — imagine a giant Excel sheet that the whole world can read but nobody can secretly edit. That's where your ownership lives.
                    </p>
                  </div>
                </div>
              </div>

              <div class="bg-white rounded-xl p-5 shadow-sm">
                <div class="flex items-start gap-3">
                  <div class="w-10 h-10 rounded-lg bg-pink-500/10 flex items-center justify-center flex-shrink-0">
                    <LuFileText class="w-5 h-5 text-pink-600" />
                  </div>
                  <div>
                    <h4 class="font-bold text-gray-900 mb-1">Minting (Creating)</h4>
                    <p class="text-sm text-gray-600">
                      ✨ <strong>Making a new NFT</strong>. Like printing an official certificate for something you created — but digital and permanent.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ for absolute beginners */}
          <div class="bg-amber-50 border border-amber-200 rounded-3xl p-8 mb-10">
            <h3 class="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              🤔 Frequently Asked Questions
            </h3>
            <div class="space-y-4">
              <div class="bg-white rounded-xl p-5 shadow-sm border border-amber-100">
                <h4 class="font-bold text-gray-900 mb-2">Do I need to know about crypto to use this?</h4>
                <p class="text-sm text-gray-600">
                  <strong>No!</strong> You can register with just your email. We'll create a wallet for you automatically. You only need MetaMask if you prefer full control.
                </p>
              </div>
              <div class="bg-white rounded-xl p-5 shadow-sm border border-amber-100">
                <h4 class="font-bold text-gray-900 mb-2">What can I actually do here?</h4>
                <p class="text-sm text-gray-600">
                  You can <strong>create</strong> digital certificates (NFTs) for anything — art, real estate, IoT sensors, membership passes. Then <strong>sell</strong>, <strong>rent</strong>, or <strong>delegate rights</strong> to them and earn money.
                </p>
              </div>
              <div class="bg-white rounded-xl p-5 shadow-sm border border-amber-100">
                <h4 class="font-bold text-gray-900 mb-2">Is it expensive?</h4>
                <p class="text-sm text-gray-600">
                  We run on <strong>Base</strong> (Layer 2), so fees are typically <strong>less than $0.01 per transaction</strong>. That's thousands of times cheaper than Ethereum mainnet.
                </p>
              </div>
              <div class="bg-white rounded-xl p-5 shadow-sm border border-amber-100">
                <h4 class="font-bold text-gray-900 mb-2">What is KNRT token?</h4>
                <p class="text-sm text-gray-600">
                  It's the <strong>platform's currency</strong>. You use KNRT to buy, sell, and rent NFTs. You can swap ETH for KNRT directly on our built-in exchange (DEX).
                </p>
              </div>
              <div class="bg-white rounded-xl p-5 shadow-sm border border-amber-100">
                <h4 class="font-bold text-gray-900 mb-2">Is my stuff safe?</h4>
                <p class="text-sm text-gray-600">
                  <strong>Yes.</strong> Everything is protected by smart contracts on the blockchain. Your ownership is publicly verifiable and cannot be changed by anyone — not even us.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* STEP 1: Wallet Setup */}
        <section class="mb-16 scroll-mt-24" id="wallet">
          <div class="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
            <button
              onClick$={() => {
                expandedSections.value = {
                  ...expandedSections.value,
                  wallet: !expandedSections.value.wallet,
                };
              }}
              class="w-full flex items-center justify-between p-8 text-left hover:bg-gray-50 transition-colors"
            >
              <div class="flex items-center gap-4">
                <div class="w-14 h-14 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-600 flex items-center justify-center">
                  <LuWallet class="w-7 h-7 text-white" />
                </div>
                <div>
                  <div class="text-sm font-semibold text-[#c1272d] mb-1">STEP 1</div>
                  <h3 class="text-2xl font-bold text-gray-900">Set Up Your Wallet</h3>
                  <p class="text-gray-600 mt-1">Connect MetaMask and configure Base network</p>
                </div>
              </div>
              <LuChevronDown
                class={`w-6 h-6 text-gray-400 transition-transform duration-300 ${expandedSections.value.wallet ? 'rotate-180' : ''
                  }`}
              />
            </button>

            {expandedSections.value.wallet && (
              <div class="px-8 pb-8 border-t border-gray-100">
                <div class="mt-6">
                  <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-r-lg">
                    <p class="text-sm text-blue-800 font-medium mb-1">⏱️ Estimated time: 5 minutes</p>
                    <p class="text-sm text-blue-700">This is the first and most important step. Without a wallet you can't use the platform.</p>
                  </div>

                  <h4 class="text-xl font-bold text-gray-900 mb-4">1.1 Install MetaMask</h4>
                  <div class="bg-gray-50 rounded-xl p-6 mb-6">
                    <ol class="space-y-3 text-gray-700">
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">1</span>
                        <span>Go to <a href="https://metamask.io" target="_blank" class="text-[#c1272d] hover:underline font-medium">metamask.io</a> and click "Download".</span>
                      </li>
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">2</span>
                        <span>Install the extension for your browser (Chrome, Firefox, Brave, etc.).</span>
                      </li>
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">3</span>
                        <span>Follow the steps to create a new wallet. <strong class="text-[#c1272d]">SAVE YOUR RECOVERY PHRASE!</strong> Write it down on paper and store it in a safe place.</span>
                      </li>
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">4</span>
                        <span>Create a strong password for your wallet.</span>
                      </li>
                    </ol>
                  </div>

                  <div class="bg-red-50 border-l-4 border-red-500 p-4 my-6 rounded-r-lg">
                    <h5 class="font-bold text-red-900 mb-2 flex items-center gap-2">
                      <LuAlertTriangle class="w-5 h-5" />
                      ⚠️ VERY IMPORTANT - Security
                    </h5>
                    <ul class="text-sm text-red-800 space-y-1 ml-7">
                      <li>• NEVER share your recovery phrase (12 or 24 words)</li>
                      <li>• NEVER share your private key</li>
                      <li>• MetaMask will NEVER ask for these credentials via email or message</li>
                      <li>• If you lose your recovery phrase, you lose access to your funds FOREVER</li>
                    </ul>
                  </div>

                  <h4 class="text-xl font-bold text-gray-900 mb-4 mt-8">1.2 Connect to KNRT Marketplace</h4>
                  <div class="bg-gray-50 rounded-xl p-6 mb-6">
                    <ol class="space-y-3 text-gray-700">
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">1</span>
                        <span>Click the <strong>"Connect Wallet"</strong> button in the top right corner of KNRT Marketplace.</span>
                      </li>
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">2</span>
                        <span>A MetaMask popup window will open asking for permission to connect.</span>
                      </li>
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">3</span>
                        <span>Select the account you want to use and click <strong>"Next"</strong> then <strong>"Connect"</strong>.</span>
                      </li>
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">4</span>
                        <span>The platform will ask you to switch to the <strong>Base</strong> network. Accept the network change.</span>
                      </li>
                    </ol>
                  </div>

                  <h4 class="text-xl font-bold text-gray-900 mb-4 mt-8">1.3 Add ETH on Base (For Gas Fees)</h4>
                  <p class="text-gray-700 mb-4">
                    To make transactions on the Base network, you need to have some ETH in your wallet to pay for fees (gas fees).
                  </p>
                  <div class="bg-gray-50 rounded-xl p-6 mb-6">
                    <h5 class="font-bold text-gray-900 mb-3">Options to get ETH on Base:</h5>
                    <div class="space-y-4">
                      <div class="bg-white rounded-lg p-4 border border-gray-200">
                        <h6 class="font-bold text-gray-900 mb-2">Option A: Bridge from Ethereum</h6>
                        <p class="text-sm text-gray-600 mb-2">If you already have ETH on Ethereum Mainnet:</p>
                        <ol class="text-sm text-gray-700 space-y-1 ml-4">
                          <li>1. Go to <a href="https://bridge.base.org" target="_blank" class="text-[#c1272d] hover:underline">bridge.base.org</a></li>
                          <li>2. Connect your wallet</li>
                          <li>3. Select the amount of ETH you want to move</li>
                          <li>4. Confirm the transaction (takes a few minutes)</li>
                        </ol>
                      </div>
                      <div class="bg-white rounded-lg p-4 border border-gray-200">
                        <h6 class="font-bold text-gray-900 mb-2">Option B: Buy directly on Base</h6>
                        <p class="text-sm text-gray-600 mb-2">Use an exchange that supports Base:</p>
                        <ul class="text-sm text-gray-700 space-y-1 ml-4">
                          <li>• Coinbase (withdraw directly to Base)</li>
                          <li>• Binance (check Base network availability)</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div class="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                    <h5 class="font-bold text-green-900 mb-2">✅ Ready when:</h5>
                    <ul class="text-sm text-green-800 space-y-1">
                      <li>✓ Your wallet is connected (you see your address above)</li>
                      <li>✓ You're on the Base network (Chain ID: 8453)</li>
                      <li>✓ You have some ETH for gas fees (~$5-10 USD is enough to start)</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* STEP 2: Get KNRT Tokens */}
        <section class="mb-16 scroll-mt-24" id="tokens">
          <div class="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
            <button
              onClick$={() => {
                expandedSections.value = {
                  ...expandedSections.value,
                  tokens: !expandedSections.value.tokens,
                };
              }}
              class="w-full flex items-center justify-between p-8 text-left hover:bg-gray-50 transition-colors"
            >
              <div class="flex items-center gap-4">
                <div class="w-14 h-14 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center">
                  <LuCoins class="w-7 h-7 text-white" />
                </div>
                <div>
                  <div class="text-sm font-semibold text-[#c1272d] mb-1">STEP 2</div>
                  <h3 class="text-2xl font-bold text-gray-900">Get KNRT Tokens</h3>
                  <p class="text-gray-600 mt-1">The currency you'll use to buy NFTs</p>
                </div>
              </div>
              <LuChevronDown
                class={`w-6 h-6 text-gray-400 transition-transform duration-300 ${expandedSections.value.tokens ? 'rotate-180' : ''
                  }`}
              />
            </button>

            {expandedSections.value.tokens && (
              <div class="px-8 pb-8 border-t border-gray-100">
                <div class="mt-6">
                  <div class="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded-r-lg">
                    <p class="text-sm text-green-800 font-medium mb-1">⏱️ Estimated time: 3 minutes</p>
                    <p class="text-sm text-green-700">You need KNRT tokens to buy NFTs on the marketplace.</p>
                  </div>

                  <h4 class="text-xl font-bold text-gray-900 mb-4">2.1 What are KNRT tokens?</h4>
                  <div class="bg-gray-50 rounded-xl p-6 mb-6">
                    <p class="text-gray-700 mb-4">
                      KNRT is an ERC-20 token (like USDT or DAI) that serves as the exchange currency within the marketplace.
                      Think of it like casino chips: you buy them with real money (ETH) and then use them to buy NFTs.
                    </p>
                    <div class="bg-white rounded-lg p-4 border border-gray-200">
                      <h5 class="font-bold text-gray-900 mb-2">Benefits of KNRT token:</h5>
                      <ul class="text-sm text-gray-700 space-y-1">
                        <li>✓ Faster and cheaper transactions within the marketplace</li>
                        <li>✓ Stable and transparent pricing</li>
                        <li>✓ You can sell your KNRT back to ETH whenever you want</li>
                      </ul>
                    </div>
                  </div>

                  <h4 class="text-xl font-bold text-gray-900 mb-4">2.2 How to get KNRT</h4>
                  <div class="bg-gray-50 rounded-xl p-6 mb-6">
                    <ol class="space-y-3 text-gray-700">
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">1</span>
                        <span>Go to the <strong>"Swap"</strong> section in the KNRT Marketplace navigation bar.</span>
                      </li>
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">2</span>
                        <span>Enter the amount of ETH you want to exchange for KNRT.</span>
                      </li>
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">3</span>
                        <span>You'll automatically see how many KNRT tokens you'll receive for your ETH.</span>
                      </li>
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">4</span>
                        <span>Click <strong>"Swap"</strong> and confirm the transaction in MetaMask.</span>
                      </li>
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">5</span>
                        <span>Wait a few seconds. Your KNRT tokens will appear in your wallet.</span>
                      </li>
                    </ol>
                  </div>

                  <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg mb-6">
                    <h5 class="font-bold text-blue-900 mb-2">💡 Tip: How much KNRT to buy?</h5>
                    <p class="text-sm text-blue-800">
                      To start, we recommend buying between 100-500 KNRT. This will be enough to buy several NFTs
                      and try out the marketplace. You can always buy more later.
                    </p>
                  </div>

                  <div class="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                    <h5 class="font-bold text-green-900 mb-2">✅ Ready when:</h5>
                    <ul class="text-sm text-green-800 space-y-1">
                      <li>✓ You have KNRT tokens in your wallet (you can see the balance above)</li>
                      <li>✓ You still have some ETH left for gas fees</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* STEP 3: Create your first NFT (Mint) */}
        <section class="mb-16 scroll-mt-24" id="mint">
          <div class="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
            <button
              onClick$={() => {
                expandedSections.value = {
                  ...expandedSections.value,
                  mint: !expandedSections.value.mint,
                };
              }}
              class="w-full flex items-center justify-between p-8 text-left hover:bg-gray-50 transition-colors"
            >
              <div class="flex items-center gap-4">
                <div class="w-14 h-14 rounded-2xl bg-gradient-to-r from-[#c1272d] to-[#d13238] flex items-center justify-center">
                  <LuFileText class="w-7 h-7 text-white" />
                </div>
                <div>
                  <div class="text-sm font-semibold text-[#c1272d] mb-1">STEP 3</div>
                  <h3 class="text-2xl font-bold text-gray-900">Create Your First NFT</h3>
                  <p class="text-gray-600 mt-1">Mint unique digital assets with specialized templates</p>
                </div>
              </div>
              <LuChevronDown
                class={`w-6 h-6 text-gray-400 transition-transform duration-300 ${expandedSections.value.mint ? 'rotate-180' : ''
                  }`}
              />
            </button>

            {expandedSections.value.mint && (
              <div class="px-8 pb-8 border-t border-gray-100">
                <div class="mt-6">
                  <div class="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg">
                    <p class="text-sm text-red-800 font-medium mb-1">⏱️ Estimated time: 5-10 minutes per NFT</p>
                    <p class="text-sm text-red-700">Choose the template that best fits your asset type</p>
                  </div>

                  <h4 class="text-xl font-bold text-gray-900 mb-4">3.1 Choose Your NFT Template</h4>
                  <p class="text-gray-700 mb-6">
                    KNRT Marketplace offers 8 specialized templates for different types of digital assets.
                    Each template is optimized for specific use cases with pre-configured fields and features.
                  </p>

                  {/* Templates Grid */}
                  <div class="grid md:grid-cols-2 gap-6 mb-8">
                    {/* IoT Sensor Template */}
                    <div class="bg-blue-50 border-2 border-blue-300 rounded-xl p-6 hover:shadow-lg transition-all">
                      <div class="flex items-center gap-3 mb-4">
                        <span class="text-3xl">📡</span>
                        <h5 class="text-lg font-bold text-blue-900">IoT Sensor Tokenization</h5>
                      </div>
                      <p class="text-sm text-blue-800 mb-3">
                        Transform physical IoT sensors into tradeable NFTs with real-time data streams.
                      </p>
                      <div class="bg-white rounded-lg p-3 text-xs text-blue-700">
                        <strong>Perfect for:</strong> Temperature sensors, air quality monitors,
                        industrial equipment, smart home devices, environmental tracking
                      </div>
                    </div>

                    {/* Map Cells Template - HIGHLIGHTED */}
                    <div class="bg-gradient-to-br from-pink-100 to-pink-200 border-4 border-pink-500 rounded-xl p-6 hover:shadow-xl transition-all relative">
                      <div class="absolute -top-3 -right-3 bg-pink-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                        REVOLUTIONARY
                      </div>
                      <div class="flex items-center gap-3 mb-4">
                        <span class="text-4xl">🗺️</span>
                        <h5 class="text-xl font-bold text-pink-900">Tokenized Image Map (Cells)</h5>
                      </div>
                      <p class="text-sm text-pink-900 font-semibold mb-3">
                        Divide any image (map, artwork, blueprint) into clickable cells. Each cell becomes a unique NFT!
                      </p>
                      <div class="bg-white rounded-lg p-3 text-xs text-pink-800 space-y-2">
                        <div><strong>🍇 Vineyards:</strong> Each plot as tradeable NFT</div>
                        <div><strong>🌾 Agriculture:</strong> Tokenize farm sections</div>
                        <div><strong>☀️ Solar Farms:</strong> Individual panel ownership</div>
                        <div><strong>🏘️ Real Estate:</strong> Property subdivisions</div>
                        <div><strong>🌳 Conservation:</strong> Adopt-a-tree programs</div>
                        <div><strong>📢 Advertising:</strong> Sell billboard spaces</div>
                      </div>
                      <div class="mt-3 bg-pink-600 text-white text-xs font-bold px-3 py-2 rounded text-center">
                        Upload your image, define grid, start selling cells!
                      </div>
                    </div>

                    {/* Live Map Template - HIGHLIGHTED */}
                    <div class="bg-gradient-to-br from-green-100 to-emerald-200 border-4 border-green-500 rounded-xl p-6 hover:shadow-xl transition-all relative">
                      <div class="absolute -top-3 -right-3 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                        INTERACTIVE
                      </div>
                      <div class="flex items-center gap-3 mb-4">
                        <span class="text-4xl">🌍</span>
                        <h5 class="text-xl font-bold text-green-900">Live Interactive Map (Leaflet)</h5>
                      </div>
                      <p class="text-sm text-green-900 font-semibold mb-3">
                        Real-world geographic coordinates as NFTs. No image upload needed!
                      </p>
                      <div class="bg-white rounded-lg p-3 text-xs text-green-800 space-y-2">
                        <div><strong>🏢 Commercial Spaces:</strong> Rent by coordinates</div>
                        <div><strong>🎪 Event Locations:</strong> Festival booths</div>
                        <div><strong>🚗 Parking Spots:</strong> Digital parking tokens</div>
                        <div><strong>🏕️ Campsites:</strong> Reserve spots on map</div>
                        <div><strong>🎯 Geolocation Games:</strong> Real-world treasure hunts</div>
                        <div><strong>📍 City Tours:</strong> Tokenized tour stops</div>
                      </div>
                      <div class="mt-3 bg-green-600 text-white text-xs font-bold px-3 py-2 rounded text-center">
                        Click on map, create NFT, geolocation included automatically!
                      </div>
                    </div>

                    {/* Property Basic Template */}
                    <div class="bg-purple-50 border-2 border-purple-300 rounded-xl p-6 hover:shadow-lg transition-all">
                      <div class="flex items-center gap-3 mb-4">
                        <span class="text-3xl">🏢</span>
                        <h5 class="text-lg font-bold text-purple-900">Property Basic</h5>
                      </div>
                      <p class="text-sm text-purple-800 mb-3">
                        Simple real estate tokenization with essential property details.
                      </p>
                      <div class="bg-white rounded-lg p-3 text-xs text-purple-700">
                        <strong>Perfect for:</strong> Apartments, houses, commercial spaces,
                        land plots, storage units
                      </div>
                    </div>

                    {/* Property Premium Template */}
                    <div class="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-6 hover:shadow-lg transition-all">
                      <div class="flex items-center gap-3 mb-4">
                        <span class="text-3xl">🏰</span>
                        <h5 class="text-lg font-bold text-yellow-900">Property Premium</h5>
                      </div>
                      <p class="text-sm text-yellow-800 mb-3">
                        Advanced real estate NFT with detailed amenities, legal docs, and floor plans.
                      </p>
                      <div class="bg-white rounded-lg p-3 text-xs text-yellow-700">
                        <strong>Perfect for:</strong> Luxury properties, investment portfolios,
                        fractional ownership, high-value commercial real estate
                      </div>
                    </div>

                    {/* Membership Template */}
                    <div class="bg-orange-50 border-2 border-orange-300 rounded-xl p-6 hover:shadow-lg transition-all">
                      <div class="flex items-center gap-3 mb-4">
                        <span class="text-3xl">🎫</span>
                        <h5 class="text-lg font-bold text-orange-900">Membership/Access</h5>
                      </div>
                      <p class="text-sm text-orange-800 mb-3">
                        Create exclusive memberships, subscriptions, and access passes as NFTs.
                      </p>
                      <div class="bg-white rounded-lg p-3 text-xs text-orange-700">
                        <strong>Perfect for:</strong> Gym passes, clubs, VIP access,
                        loyalty programs, season tickets
                      </div>
                    </div>

                    {/* Artwork Template */}
                    <div class="bg-red-50 border-2 border-red-300 rounded-xl p-6 hover:shadow-lg transition-all">
                      <div class="flex items-center gap-3 mb-4">
                        <span class="text-3xl">🎨</span>
                        <h5 class="text-lg font-bold text-red-900">Artwork/Digital Art</h5>
                      </div>
                      <p class="text-sm text-red-800 mb-3">
                        Tokenize digital art, photography, designs, and creative works.
                      </p>
                      <div class="bg-white rounded-lg p-3 text-xs text-red-700">
                        <strong>Perfect for:</strong> Digital paintings, 3D models,
                        photography, generative art, limited editions
                      </div>
                    </div>

                    {/* Gaming Template */}
                    <div class="bg-indigo-50 border-2 border-indigo-300 rounded-xl p-6 hover:shadow-lg transition-all">
                      <div class="flex items-center gap-3 mb-4">
                        <span class="text-3xl">🎮</span>
                        <h5 class="text-lg font-bold text-indigo-900">Gaming Assets</h5>
                      </div>
                      <p class="text-sm text-indigo-800 mb-3">
                        In-game items, characters, weapons, and virtual goods as NFTs.
                      </p>
                      <div class="bg-white rounded-lg p-3 text-xs text-indigo-700">
                        <strong>Perfect for:</strong> Game items, character skins,
                        virtual land, collectibles, achievement badges
                      </div>
                    </div>
                  </div>

                  <h4 class="text-xl font-bold text-gray-900 mb-4 mt-8">3.2 Minting Process</h4>
                  <div class="bg-gray-50 rounded-xl p-6 mb-6">
                    <ol class="space-y-4 text-gray-700">
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">1</span>
                        <div>
                          <strong>Select Template:</strong> Go to the <strong>"Mint"</strong> section and choose the template that fits your asset.
                        </div>
                      </li>
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">2</span>
                        <div>
                          <strong>Fill Details:</strong> Complete all required fields (name, description, properties, etc.).
                          For map templates, upload your image or click on coordinates.
                        </div>
                      </li>
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">3</span>
                        <div>
                          <strong>Upload Media:</strong> Add your image, video, or 3D model. The platform supports JPEG, PNG, GIF, MP4, GLB, and more.
                        </div>
                      </li>
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">4</span>
                        <div>
                          <strong>Set Rarity & Supply:</strong> Define if it's a unique piece (1/1) or a limited edition (10/100).
                        </div>
                      </li>
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">5</span>
                        <div>
                          <strong>Review & Confirm:</strong> Check all details, then click <strong>"Mint NFT"</strong>.
                        </div>
                      </li>
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">6</span>
                        <div>
                          <strong>Approve Transaction:</strong> MetaMask will open requesting approval.
                          Confirm the gas fee and approve the transaction.
                        </div>
                      </li>
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">7</span>
                        <div>
                          <strong>Wait for Confirmation:</strong> The transaction usually takes 10-30 seconds.
                          Once confirmed, your NFT appears in your portfolio!
                        </div>
                      </li>
                    </ol>
                  </div>

                  <div class="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                    <h5 class="font-bold text-green-900 mb-2">✅ Your NFT is ready when:</h5>
                    <ul class="text-sm text-green-800 space-y-1">
                      <li>✓ Transaction confirmed on blockchain</li>
                      <li>✓ NFT appears in your "My NFTs" section</li>
                      <li>✓ You can list it for sale or rent</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* STEP 4: Buy NFTs */}
        <section class="mb-16 scroll-mt-24" id="buy">
          <div class="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
            <button
              onClick$={() => {
                expandedSections.value = {
                  ...expandedSections.value,
                  buy: !expandedSections.value.buy,
                };
              }}
              class="w-full flex items-center justify-between p-8 text-left hover:bg-gray-50 transition-colors"
            >
              <div class="flex items-center gap-4">
                <div class="w-14 h-14 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center">
                  <LuShoppingCart class="w-7 h-7 text-white" />
                </div>
                <div>
                  <div class="text-sm font-semibold text-[#c1272d] mb-1">STEP 4</div>
                  <h3 class="text-2xl font-bold text-gray-900">Buy & Sell NFTs</h3>
                  <p class="text-gray-600 mt-1">Trade digital assets securely on the marketplace</p>
                </div>
              </div>
              <LuChevronDown
                class={`w-6 h-6 text-gray-400 transition-transform duration-300 ${expandedSections.value.buy ? 'rotate-180' : ''
                  }`}
              />
            </button>

            {expandedSections.value.buy && (
              <div class="px-8 pb-8 border-t border-gray-100">
                <div class="mt-6">
                  <div class="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded-r-lg">
                    <p class="text-sm text-green-800 font-medium mb-1">⏱️ Estimated time: 2-3 minutes per purchase</p>
                    <p class="text-sm text-green-700">Browse, select, and purchase NFTs with KNRT tokens</p>
                  </div>

                  <h4 class="text-xl font-bold text-gray-900 mb-4">4.1 How to Buy an NFT</h4>
                  <div class="bg-gray-50 rounded-xl p-6 mb-6">
                    <ol class="space-y-4 text-gray-700">
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">1</span>
                        <div>
                          <strong>Browse Marketplace:</strong> Go to <strong>"All NFTs"</strong> to see available listings.
                          Use filters to find specific types (IoT, Maps, Real Estate, Art, etc.).
                        </div>
                      </li>
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">2</span>
                        <div>
                          <strong>View NFT Details:</strong> Click on any NFT to see its full description,
                          properties, owner info, price in KNRT, and transaction history.
                        </div>
                      </li>
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">3</span>
                        <div>
                          <strong>Check Price:</strong> The price is displayed in KNRT tokens.
                          Make sure you have enough KNRT balance (visible in the top right).
                        </div>
                      </li>
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">4</span>
                        <div>
                          <strong>Click "Buy Now":</strong> A confirmation modal appears showing the price,
                          gas fees, and total cost.
                        </div>
                      </li>
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">5</span>
                        <div>
                          <strong>Approve KNRT Spending:</strong> (First-time only) MetaMask will ask you to approve
                          the marketplace to spend your KNRT tokens. Confirm this transaction.
                        </div>
                      </li>
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">6</span>
                        <div>
                          <strong>Confirm Purchase:</strong> After approval, MetaMask opens again for the actual purchase.
                          Review details and confirm.
                        </div>
                      </li>
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">7</span>
                        <div>
                          <strong>Wait for Confirmation:</strong> Transaction takes 10-30 seconds.
                          The NFT is transferred to your wallet automatically.
                        </div>
                      </li>
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">8</span>
                        <div>
                          <strong>View Your New NFT:</strong> Go to <strong>"My NFTs"</strong> to see your purchase.
                          You can now list it for resale or keep it in your collection.
                        </div>
                      </li>
                    </ol>
                  </div>

                  <h4 class="text-xl font-bold text-gray-900 mb-4 mt-8">4.2 How to Sell Your NFT</h4>
                  <div class="bg-gray-50 rounded-xl p-6 mb-6">
                    <ol class="space-y-4 text-gray-700">
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">1</span>
                        <div>
                          <strong>Go to "My NFTs":</strong> Access your NFT portfolio from the navigation menu.
                        </div>
                      </li>
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">2</span>
                        <div>
                          <strong>Select NFT to Sell:</strong> Click on the NFT you want to list for sale.
                        </div>
                      </li>
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">3</span>
                        <div>
                          <strong>Click "List for Sale":</strong> A form appears asking for your desired price in KNRT.
                        </div>
                      </li>
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">4</span>
                        <div>
                          <strong>Set Your Price:</strong> Enter the amount in KNRT.
                          Research similar NFTs to set a competitive price.
                        </div>
                      </li>
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">5</span>
                        <div>
                          <strong>Approve Marketplace Access:</strong> (First-time only) MetaMask requests approval
                          for the marketplace to manage your NFT. Confirm this.
                        </div>
                      </li>
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">6</span>
                        <div>
                          <strong>Confirm Listing:</strong> MetaMask opens again to finalize the listing. Confirm the transaction.
                        </div>
                      </li>
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">7</span>
                        <div>
                          <strong>Your NFT is Listed:</strong> It now appears in the marketplace with your price.
                          Buyers can purchase it instantly.
                        </div>
                      </li>
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">8</span>
                        <div>
                          <strong>Receive Payment:</strong> When someone buys your NFT, you automatically receive
                          KNRT tokens in your wallet (minus marketplace fees).
                        </div>
                      </li>
                    </ol>
                  </div>

                  <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg mb-6">
                    <h5 class="font-bold text-blue-900 mb-2">💡 Pricing Tips:</h5>
                    <ul class="text-sm text-blue-800 space-y-1">
                      <li>• Check similar NFTs to gauge market price</li>
                      <li>• Consider rarity, utility, and demand</li>
                      <li>• You can update your listing price anytime</li>
                      <li>• Lower prices sell faster; higher prices maximize profit</li>
                    </ul>
                  </div>

                  <div class="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                    <h5 class="font-bold text-green-900 mb-2">✅ Benefits of KNRT Trading:</h5>
                    <ul class="text-sm text-green-800 space-y-1">
                      <li>✓ Instant transactions (10-30 seconds)</li>
                      <li>✓ Low gas fees on Base network ($0.01-$1)</li>
                      <li>✓ Transparent pricing in KNRT tokens</li>
                      <li>✓ Secure smart contract escrow</li>
                      <li>✓ Full transaction history on blockchain</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* STEP 5: Rent NFTs */}
        <section class="mb-16 scroll-mt-24" id="rent">
          <div class="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
            <button
              onClick$={() => {
                expandedSections.value = {
                  ...expandedSections.value,
                  rent: !expandedSections.value.rent,
                };
              }}
              class="w-full flex items-center justify-between p-8 text-left hover:bg-gray-50 transition-colors"
            >
              <div class="flex items-center gap-4">
                <div class="w-14 h-14 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-600 flex items-center justify-center">
                  <LuHome class="w-7 h-7 text-white" />
                </div>
                <div>
                  <div class="text-sm font-semibold text-[#c1272d] mb-1">STEP 5</div>
                  <h3 class="text-2xl font-bold text-gray-900">Rent NFTs</h3>
                  <p class="text-gray-600 mt-1">Generate passive income or access NFTs temporarily</p>
                </div>
              </div>
              <LuChevronDown
                class={`w-6 h-6 text-gray-400 transition-transform duration-300 ${expandedSections.value.rent ? 'rotate-180' : ''
                  }`}
              />
            </button>

            {expandedSections.value.rent && (
              <div class="px-8 pb-8 border-t border-gray-100">
                <div class="mt-6">
                  <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-r-lg">
                    <p class="text-sm text-blue-800 font-medium mb-1">⏱️ Rental duration: Flexible (hours to months)</p>
                    <p class="text-sm text-blue-700">Perfect for temporary access without full ownership cost</p>
                  </div>

                  <h4 class="text-xl font-bold text-gray-900 mb-4">5.1 What is NFT Rental?</h4>
                  <div class="bg-gray-50 rounded-xl p-6 mb-6">
                    <p class="text-gray-700 mb-4">
                      NFT rental allows <strong>owners to earn passive income</strong> by renting out their NFTs,
                      while <strong>renters gain temporary access</strong> to utilities, benefits, or features
                      without purchasing the full NFT.
                    </p>
                    <div class="grid md:grid-cols-2 gap-4">
                      <div class="bg-white rounded-lg p-4 border border-gray-200">
                        <h5 class="font-bold text-gray-900 mb-2">For Owners:</h5>
                        <ul class="text-sm text-gray-700 space-y-1">
                          <li>✓ Generate passive income</li>
                          <li>✓ Retain full ownership</li>
                          <li>✓ Set your own rental terms</li>
                          <li>✓ Automatic smart contract enforcement</li>
                        </ul>
                      </div>
                      <div class="bg-white rounded-lg p-4 border border-gray-200">
                        <h5 class="font-bold text-gray-900 mb-2">For Renters:</h5>
                        <ul class="text-sm text-gray-700 space-y-1">
                          <li>✓ Access without full purchase cost</li>
                          <li>✓ Try before buying</li>
                          <li>✓ Temporary access to exclusive perks</li>
                          <li>✓ Flexible rental periods</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <h4 class="text-xl font-bold text-gray-900 mb-4">5.2 How to Rent Out Your NFT (Owner)</h4>
                  <div class="bg-gray-50 rounded-xl p-6 mb-6">
                    <ol class="space-y-4 text-gray-700">
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">1</span>
                        <div>
                          <strong>Go to "My NFTs":</strong> Select the NFT you want to list for rent.
                        </div>
                      </li>
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">2</span>
                        <div>
                          <strong>Click "List for Rent":</strong> A form opens asking for rental terms.
                        </div>
                      </li>
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">3</span>
                        <div>
                          <strong>Set Rental Price:</strong> Enter the amount in KNRT that renters will pay per rental period.
                        </div>
                      </li>
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">4</span>
                        <div>
                          <strong>Set Maximum Duration:</strong> Define the maximum rental time (in days or hours).
                        </div>
                      </li>
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">5</span>
                        <div>
                          <strong>Approve & Confirm:</strong> MetaMask requests approval to list the NFT. Confirm the transaction.
                        </div>
                      </li>
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">6</span>
                        <div>
                          <strong>NFT is Listed:</strong> Renters can now find and rent your NFT.
                          You receive KNRT payment each time someone rents it.
                        </div>
                      </li>
                    </ol>
                  </div>

                  <h4 class="text-xl font-bold text-gray-900 mb-4 mt-8">5.3 How to Rent an NFT (Renter)</h4>
                  <div class="bg-gray-50 rounded-xl p-6 mb-6">
                    <ol class="space-y-4 text-gray-700">
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">1</span>
                        <div>
                          <strong>Browse Rentals:</strong> Go to <strong>"Rentals"</strong> section to see NFTs available for rent.
                        </div>
                      </li>
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">2</span>
                        <div>
                          <strong>View Rental Terms:</strong> Click on an NFT to see rental price, maximum duration, and benefits.
                        </div>
                      </li>
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">3</span>
                        <div>
                          <strong>Select Duration:</strong> Choose how long you want to rent (up to maximum allowed).
                        </div>
                      </li>
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">4</span>
                        <div>
                          <strong>Click "Rent Now":</strong> Review the total cost (rental fee × duration).
                        </div>
                      </li>
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">5</span>
                        <div>
                          <strong>Approve & Pay:</strong> MetaMask opens for payment approval. Confirm to rent the NFT.
                        </div>
                      </li>
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">6</span>
                        <div>
                          <strong>Access Granted:</strong> You now have temporary access to the NFT's utilities.
                          Check <strong>"My Rentals"</strong> to see expiration time.
                        </div>
                      </li>
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">7</span>
                        <div>
                          <strong>Automatic Return:</strong> When the rental period expires, all rights automatically
                          revert back to the owner. No action needed from you.
                        </div>
                      </li>
                    </ol>
                  </div>

                  <div class="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-r-lg mb-6">
                    <h5 class="font-bold text-purple-900 mb-2">🎯 Use Cases for NFT Rental:</h5>
                    <ul class="text-sm text-purple-800 space-y-2">
                      <li><strong>• Gaming:</strong> Rent powerful in-game items for tournaments</li>
                      <li><strong>• Memberships:</strong> Temporary gym, club, or event access</li>
                      <li><strong>• Real Estate:</strong> Short-term property access (Airbnb-style)</li>
                      <li><strong>• Tools/Equipment:</strong> Rent IoT sensors or industrial equipment</li>
                      <li><strong>• Artwork:</strong> Display digital art in virtual galleries</li>
                      <li><strong>• Credentials:</strong> Temporary professional certifications</li>
                    </ul>
                  </div>

                  <div class="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                    <h5 class="font-bold text-green-900 mb-2">✅ Rental Security:</h5>
                    <ul class="text-sm text-green-800 space-y-1">
                      <li>✓ Owner retains full ownership during rental</li>
                      <li>✓ Smart contract enforces automatic expiration</li>
                      <li>✓ Renter cannot sell or transfer rented NFT</li>
                      <li>✓ Payment is instant and secure</li>
                      <li>✓ All terms are transparent on blockchain</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* STEP 6: Rights Transfer (Delegation) */}
        <section class="mb-16 scroll-mt-24" id="rights">
          <div class="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
            <button
              onClick$={() => {
                expandedSections.value = {
                  ...expandedSections.value,
                  rights: !expandedSections.value.rights,
                };
              }}
              class="w-full flex items-center justify-between p-8 text-left hover:bg-gray-50 transition-colors"
            >
              <div class="flex items-center gap-4">
                <div class="w-14 h-14 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center">
                  <LuZap class="w-7 h-7 text-white" />
                </div>
                <div>
                  <div class="text-sm font-semibold text-[#c1272d] mb-1">STEP 6</div>
                  <h3 class="text-2xl font-bold text-gray-900">Rights Transfer (Delegation)</h3>
                  <p class="text-gray-600 mt-1">Grant temporary control without losing ownership</p>
                </div>
              </div>
              <LuChevronDown
                class={`w-6 h-6 text-gray-400 transition-transform duration-300 ${expandedSections.value.rights ? 'rotate-180' : ''
                  }`}
              />
            </button>

            {expandedSections.value.rights && (
              <div class="px-8 pb-8 border-t border-gray-100">
                <div class="mt-6">
                  <div class="bg-purple-50 border-l-4 border-purple-500 p-4 mb-6 rounded-r-lg">
                    <p class="text-sm text-purple-800 font-medium mb-1">⏱️ Instant delegation</p>
                    <p class="text-sm text-purple-700">Transfer usage rights without transferring ownership</p>
                  </div>

                  <h4 class="text-xl font-bold text-gray-900 mb-4">6.1 What is Rights Transfer?</h4>
                  <div class="bg-gray-50 rounded-xl p-6 mb-6">
                    <p class="text-gray-700 mb-4">
                      Rights Transfer (also called delegation) allows you to <strong>grant another wallet address
                        the ability to use your NFT</strong> without actually transferring ownership. You remain the
                      legal owner and can revoke the delegation at any time.
                    </p>
                    <div class="bg-white rounded-lg p-4 border border-gray-200">
                      <h5 class="font-bold text-gray-900 mb-2">Key Differences from Rental:</h5>
                      <div class="text-sm text-gray-700 space-y-2">
                        <div class="flex gap-2">
                          <span class="text-purple-600">•</span>
                          <span><strong>No time limit:</strong> Delegation lasts until you revoke it</span>
                        </div>
                        <div class="flex gap-2">
                          <span class="text-purple-600">•</span>
                          <span><strong>No payment required:</strong> Free transfer of usage rights</span>
                        </div>
                        <div class="flex gap-2">
                          <span class="text-purple-600">•</span>
                          <span><strong>Trust-based:</strong> Ideal for teams, family, or partners</span>
                        </div>
                        <div class="flex gap-2">
                          <span class="text-purple-600">•</span>
                          <span><strong>Instant revocation:</strong> Take back control anytime</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <h4 class="text-xl font-bold text-gray-900 mb-4">6.2 How to Delegate Rights</h4>
                  <div class="bg-gray-50 rounded-xl p-6 mb-6">
                    <ol class="space-y-4 text-gray-700">
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">1</span>
                        <div>
                          <strong>Go to "My NFTs":</strong> Select the NFT you want to delegate.
                        </div>
                      </li>
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">2</span>
                        <div>
                          <strong>Click "Transfer Rights":</strong> A form opens asking for the delegate's wallet address.
                        </div>
                      </li>
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">3</span>
                        <div>
                          <strong>Enter Wallet Address:</strong> Paste the recipient's wallet address (0x...).
                        </div>
                      </li>
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">4</span>
                        <div>
                          <strong>Verify Address:</strong> Double-check the address is correct. Delegating to the wrong
                          address means someone else gains access!
                        </div>
                      </li>
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">5</span>
                        <div>
                          <strong>Confirm Delegation:</strong> MetaMask opens requesting approval. Confirm the transaction.
                        </div>
                      </li>
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">6</span>
                        <div>
                          <strong>Rights Transferred:</strong> The delegate can now use the NFT as if they owned it,
                          but <strong>you remain the legal owner</strong>.
                        </div>
                      </li>
                    </ol>
                  </div>

                  <h4 class="text-xl font-bold text-gray-900 mb-4 mt-8">6.3 How to Revoke Delegation</h4>
                  <div class="bg-gray-50 rounded-xl p-6 mb-6">
                    <ol class="space-y-4 text-gray-700">
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">1</span>
                        <div>
                          <strong>Go to "My NFTs":</strong> Select the delegated NFT.
                        </div>
                      </li>
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">2</span>
                        <div>
                          <strong>Click "Revoke Rights":</strong> You'll see the current delegate's address.
                        </div>
                      </li>
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">3</span>
                        <div>
                          <strong>Confirm Revocation:</strong> MetaMask opens. Approve the transaction.
                        </div>
                      </li>
                      <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[#c1272d] text-white text-sm font-bold flex items-center justify-center">4</span>
                        <div>
                          <strong>Rights Revoked:</strong> The delegate immediately loses all access.
                          You regain full control.
                        </div>
                      </li>
                    </ol>
                  </div>

                  <div class="bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded-r-lg mb-6">
                    <h5 class="font-bold text-indigo-900 mb-2">🎯 Use Cases for Rights Delegation:</h5>
                    <ul class="text-sm text-indigo-800 space-y-2">
                      <li><strong>• Gaming Guilds:</strong> Guild leader delegates NFTs to team members</li>
                      <li><strong>• Asset Management:</strong> Grant portfolio managers access to your NFTs</li>
                      <li><strong>• Family Sharing:</strong> Share subscription NFTs with family members</li>
                      <li><strong>• Business Operations:</strong> Delegate corporate NFT assets to employees</li>
                      <li><strong>• Collaborative Projects:</strong> Multiple users working with shared NFTs</li>
                      <li><strong>• Temporary Loans:</strong> Lend NFT to friend without rental fees</li>
                    </ul>
                  </div>

                  <div class="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg mb-6">
                    <h5 class="font-bold text-red-900 mb-2 flex items-center gap-2">
                      <LuAlertTriangle class="w-5 h-5" />
                      ⚠️ Important Security Notes
                    </h5>
                    <ul class="text-sm text-red-800 space-y-1">
                      <li>• Delegate cannot sell or transfer the NFT</li>
                      <li>• You remain the legal owner at all times</li>
                      <li>• Always verify the wallet address before delegating</li>
                      <li>• You can revoke delegation instantly anytime</li>
                      <li>• Delegate has same access as owner (use utilities, view private data, etc.)</li>
                      <li>• Only delegate to trusted addresses</li>
                    </ul>
                  </div>

                  <div class="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                    <h5 class="font-bold text-green-900 mb-2">✅ Benefits of Rights Transfer:</h5>
                    <ul class="text-sm text-green-800 space-y-1">
                      <li>✓ Free (no rental fees)</li>
                      <li>✓ Instant delegation and revocation</li>
                      <li>✓ No time limits</li>
                      <li>✓ You retain full ownership</li>
                      <li>✓ Perfect for teams and collaborations</li>
                      <li>✓ Delegate can use all NFT utilities</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* FAQ Section */}
        <section class="mb-16" id="faq">
          <div class="text-center mb-12">
            <h2 class="text-3xl sm:text-4xl font-bold text-gray-900">Frequently Asked Questions</h2>
            <p class="mt-4 text-lg text-gray-600">Answers to the most common questions</p>
          </div>

          <div class="space-y-4">
            <details class="group bg-white rounded-2xl border-2 border-gray-200 p-6 hover:border-[#c1272d]/30 transition-all">
              <summary class="font-bold text-gray-900 cursor-pointer flex items-center justify-between">
                <span class="flex items-center gap-3">
                  <LuHelpCircle class="w-5 h-5 text-[#c1272d]" />
                  Do I need blockchain knowledge to use the platform?
                </span>
                <LuChevronDown class="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" />
              </summary>
              <p class="mt-4 text-gray-600 pl-8">
                No. This whitepaper is designed for people with no prior knowledge. You just need to follow the steps: install MetaMask,
                connect your wallet and you'll be able to browse, create and buy NFTs. The platform guides you through each action.
              </p>
            </details>

            <details class="group bg-white rounded-2xl border-2 border-gray-200 p-6 hover:border-[#c1272d]/30 transition-all">
              <summary class="font-bold text-gray-900 cursor-pointer flex items-center justify-between">
                <span class="flex items-center gap-3">
                  <LuShield class="w-5 h-5 text-[#c1272d]" />
                  Is it safe to connect my wallet?
                </span>
                <LuChevronDown class="w-5 h-5 text-gray-400 group-open:rotate-180 transition-all" />
              </summary>
              <p class="mt-4 text-gray-600 pl-8">
                Yes, as long as you follow security rules: never share your recovery phrase, verify you're on the correct site
                (check the URL), and MetaMask only asks for permissions to see your public address, not your private keys.
              </p>
            </details>

            <details class="group bg-white rounded-2xl border-2 border-gray-200 p-6 hover:border-[#c1272d]/30 transition-all">
              <summary class="font-bold text-gray-900 cursor-pointer flex items-center justify-between">
                <span class="flex items-center gap-3">
                  <LuCoins class="w-5 h-5 text-[#c1272d]" />
                  How much does it cost to use KNRT Marketplace?
                </span>
                <LuChevronDown class="w-5 h-5 text-gray-400 group-open:rotate-180 transition-all" />
              </summary>
              <p class="mt-4 text-gray-600 pl-8">
                Browsing and viewing NFTs is free. To create (mint), buy or sell NFTs, you only pay gas fees (network fees, usually $0.50-$2 USD on Base).
                NFT prices are set by the creators/sellers.
              </p>
            </details>

            <details class="group bg-white rounded-2xl border-2 border-gray-200 p-6 hover:border-[#c1272d]/30 transition-all">
              <summary class="font-bold text-gray-900 cursor-pointer flex items-center justify-between">
                <span class="flex items-center gap-3">
                  <LuAlertTriangle class="w-5 h-5 text-[#c1272d]" />
                  What happens if I lose my recovery phrase?
                </span>
                <LuChevronDown class="w-5 h-5 text-gray-400 group-open:rotate-180 transition-all" />
              </summary>
              <p class="mt-4 text-gray-600 pl-8">
                You will permanently lose access to your wallet and everything in it (NFTs, tokens, ETH). <strong class="text-red-600">THERE IS NO WAY TO RECOVER IT</strong>.
                That's why it's critical to write it down on paper and keep it in a safe place, never digitally.
              </p>
            </details>

            <details class="group bg-white rounded-2xl border-2 border-gray-200 p-6 hover:border-[#c1272d]/30 transition-all">
              <summary class="font-bold text-gray-900 cursor-pointer flex items-center justify-between">
                <span class="flex items-center gap-3">
                  <LuFileText class="w-5 h-5 text-[#c1272d]" />
                  Are my NFTs really on the blockchain?
                </span>
                <LuChevronDown class="w-5 h-5 text-gray-400 group-open:rotate-180 transition-all" />
              </summary>
              <p class="mt-4 text-gray-600 pl-8">
                Yes. When you create an NFT, it's permanently recorded on the Base blockchain. You can verify your NFT on
                <a href="https://basescan.org" target="_blank" class="text-[#c1272d] hover:underline ml-1">BaseScan</a>
                using the token ID or your wallet address.
              </p>
            </details>

            <details class="group bg-white rounded-2xl border-2 border-gray-200 p-6 hover:border-[#c1272d]/30 transition-all">
              <summary class="font-bold text-gray-900 cursor-pointer flex items-center justify-between">
                <span class="flex items-center gap-3">
                  <LuHome class="w-5 h-5 text-[#c1272d]" />
                  How does NFT rental work?
                </span>
                <LuChevronDown class="w-5 h-5 text-gray-400 group-open:rotate-180 transition-all" />
              </summary>
              <p class="mt-4 text-gray-600 pl-8">
                The NFT owner lists it for rent by setting a price and duration. A tenant pays the amount and gets temporary access to the NFT
                (can view private metadata, use utilities, etc.). When the term expires, control automatically returns to the owner.
              </p>
            </details>

            <details class="group bg-white rounded-2xl border-2 border-gray-200 p-6 hover:border-[#c1272d]/30 transition-all">
              <summary class="font-bold text-gray-900 cursor-pointer flex items-center justify-between">
                <span class="flex items-center gap-3">
                  <LuZap class="w-5 h-5 text-[#c1272d]" />
                  What is "Rights" transfer for?
                </span>
                <LuChevronDown class="w-5 h-5 text-gray-400 group-open:rotate-180 transition-all" />
              </summary>
              <p class="mt-4 text-gray-600 pl-8">
                Temporary rights allows you to give someone else control over your NFT without transferring ownership. It's useful for delegations,
                asset managers, or temporary loans. The owner can revoke the rights at any time.
              </p>
            </details>
          </div>
        </section>

        {/* Call to Action Final */}
        <section class="bg-gradient-to-r from-[#c1272d] to-[#d13238] rounded-3xl p-12 text-center text-white mb-16">
          <h2 class="text-3xl sm:text-4xl font-bold mb-4">Ready to get started?</h2>
          <p class="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
            Now that you know the basics, it's time to explore the marketplace and create your first NFT.
          </p>
          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={`${localeBase}/marketplace/`}
              class="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-[#c1272d] rounded-2xl font-bold text-lg hover:bg-gray-100 transition-all shadow-lg"
            >
              <LuShoppingCart class="w-5 h-5" />
              Explore Marketplace
            </a>
            <a
              href={`${localeBase}/mint/`}
              class="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-sm text-white border-2 border-white rounded-2xl font-bold text-lg hover:bg-white/20 transition-all"
            >
              <LuFileText class="w-5 h-5" />
              Create my NFT
            </a>
          </div>
        </section>
      </div>
    </div>
  );
});

export const head: DocumentHead = ({ url, params }) =>
  buildSeo({
    title: 'Documentation and Feature Guide | Crypto Helper',
    description:
      'Official Crypto Helper docs: wallet setup, dashboards, token discovery, NFT flows, and feature walkthroughs for beginners.',
    canonicalUrl: url.href,
    locale: localeFromParams(params),
    type: 'article',
  });
