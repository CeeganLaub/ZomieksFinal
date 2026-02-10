import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clear existing data using raw query
  const tables = [
    'CourseReview', 'LessonProgress', 'CourseEnrollment', 'CourseLesson', 
    'CourseSection', 'Course',
    'Activity', 'ConversationMetrics', 'ConversationNote', 'ConversationLabel', 
    'Message', 'Conversation', 'SavedReply', 'AutoTrigger', 'PipelineStage', 
    'Label', 'Review', 'Notification', 'Refund', 'Dispute', 'EscrowHold', 
    'SellerPayout', 'OrderRevision', 'OrderDelivery', 'OrderMilestone', 
    'Transaction', 'Order', 'SubscriptionPayment', 'Subscription', 
    'SubscriptionTier', 'ServicePackage', 'Favorite', 'Service', 
    'Category', 'RefreshToken', 'Session', 'SellerProfile', 'BankDetails', 
    'UserRole', 'SellerMetrics', 'User'
  ];
  
  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
    } catch (e) {
      // Table might not exist, continue
    }
  }

  console.log('✅ Cleared existing data');

  // Create categories
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: 'Graphics & Design',
        slug: 'graphics-design',
        description: 'Logo design, brand identity, illustrations, and more',
        icon: 'palette',
        order: 1,
        children: {
          create: [
            { name: 'Logo Design', slug: 'logo-design', order: 1 },
            { name: 'Brand Style Guides', slug: 'brand-style-guides', order: 2 },
            { name: 'Business Cards', slug: 'business-cards', order: 3 },
            { name: 'Illustration', slug: 'illustration', order: 4 },
            { name: 'Web & App Design', slug: 'web-app-design', order: 5 },
          ],
        },
      },
      include: { children: true },
    }),
    prisma.category.create({
      data: {
        name: 'Programming & Tech',
        slug: 'programming-tech',
        description: 'Web development, mobile apps, and software solutions',
        icon: 'code',
        order: 2,
        children: {
          create: [
            { name: 'Website Development', slug: 'website-development', order: 1 },
            { name: 'E-Commerce Development', slug: 'ecommerce-development', order: 2 },
            { name: 'Mobile Apps', slug: 'mobile-apps', order: 3 },
            { name: 'Desktop Applications', slug: 'desktop-applications', order: 4 },
            { name: 'APIs & Integrations', slug: 'apis-integrations', order: 5 },
          ],
        },
      },
      include: { children: true },
    }),
    prisma.category.create({
      data: {
        name: 'Digital Marketing',
        slug: 'digital-marketing',
        description: 'SEO, social media, advertising, and content marketing',
        icon: 'megaphone',
        order: 3,
        children: {
          create: [
            { name: 'Social Media Marketing', slug: 'social-media-marketing', order: 1 },
            { name: 'SEO', slug: 'seo', order: 2 },
            { name: 'Content Marketing', slug: 'content-marketing', order: 3 },
            { name: 'Email Marketing', slug: 'email-marketing', order: 4 },
            { name: 'PPC Advertising', slug: 'ppc-advertising', order: 5 },
          ],
        },
      },
      include: { children: true },
    }),
    prisma.category.create({
      data: {
        name: 'Writing & Translation',
        slug: 'writing-translation',
        description: 'Articles, copywriting, translation, and proofreading',
        icon: 'pencil',
        order: 4,
        children: {
          create: [
            { name: 'Articles & Blog Posts', slug: 'articles-blog-posts', order: 1 },
            { name: 'Website Content', slug: 'website-content', order: 2 },
            { name: 'Copywriting', slug: 'copywriting', order: 3 },
            { name: 'Translation', slug: 'translation', order: 4 },
            { name: 'Proofreading & Editing', slug: 'proofreading-editing', order: 5 },
          ],
        },
      },
      include: { children: true },
    }),
    prisma.category.create({
      data: {
        name: 'Video & Animation',
        slug: 'video-animation',
        description: 'Video editing, animation, and motion graphics',
        icon: 'video',
        order: 5,
        children: {
          create: [
            { name: 'Video Editing', slug: 'video-editing', order: 1 },
            { name: 'Animated Explainers', slug: 'animated-explainers', order: 2 },
            { name: 'Logo Animation', slug: 'logo-animation', order: 3 },
            { name: '3D Modeling', slug: '3d-modeling', order: 4 },
            { name: 'Whiteboard Videos', slug: 'whiteboard-videos', order: 5 },
          ],
        },
      },
      include: { children: true },
    }),
    prisma.category.create({
      data: {
        name: 'Music & Audio',
        slug: 'music-audio',
        description: 'Music production, voiceovers, and audio editing',
        icon: 'music',
        order: 6,
        children: {
          create: [
            { name: 'Voice Over', slug: 'voice-over', order: 1 },
            { name: 'Music Production', slug: 'music-production', order: 2 },
            { name: 'Mixing & Mastering', slug: 'mixing-mastering', order: 3 },
            { name: 'Podcast Editing', slug: 'podcast-editing', order: 4 },
            { name: 'Sound Effects', slug: 'sound-effects', order: 5 },
          ],
        },
      },
      include: { children: true },
    }),
    prisma.category.create({
      data: {
        name: 'Business',
        slug: 'business',
        description: 'Virtual assistance, consulting, and business services',
        icon: 'briefcase',
        order: 7,
        children: {
          create: [
            { name: 'Virtual Assistant', slug: 'virtual-assistant', order: 1 },
            { name: 'Business Plans', slug: 'business-plans', order: 2 },
            { name: 'Financial Consulting', slug: 'financial-consulting', order: 3 },
            { name: 'Legal Consulting', slug: 'legal-consulting', order: 4 },
            { name: 'Data Entry', slug: 'data-entry', order: 5 },
          ],
        },
      },
      include: { children: true },
    }),
  ]);

  console.log(`✅ Created ${categories.length} categories with subcategories`);

  // Create password hash
  const passwordHash = await bcrypt.hash('Password123', 12);

  // Create users
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@zomieks.co.za',
      username: 'admin',
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      isEmailVerified: true,
      isAdmin: true,
      roles: {
        create: [
          { role: 'ADMIN' },
          { role: 'MODERATOR' },
        ],
      },
    },
  });

  const sellerUser1 = await prisma.user.create({
    data: {
      email: 'john@example.com',
      username: 'johndesigner',
      passwordHash,
      firstName: 'John',
      lastName: 'Smith',
      isEmailVerified: true,
      isSeller: true,
      roles: {
        create: [{ role: 'SELLER' }],
      },
      sellerProfile: {
        create: {
          displayName: 'John Smith Design',
          professionalTitle: 'Senior Graphic Designer',
          description: 'I am a professional graphic designer with over 10 years of experience in branding, logo design, and visual identity. I have worked with clients from startups to Fortune 500 companies.',
          skills: ['Logo Design', 'Branding', 'Illustration', 'Adobe Photoshop', 'Adobe Illustrator'],
          languages: [
            { language: 'English', proficiency: 'NATIVE' },
            { language: 'Afrikaans', proficiency: 'FLUENT' },
          ],
          isVerified: true,
          responseTimeMinutes: 60,
          onTimeDeliveryRate: 98,
          rating: 4.9,
          reviewCount: 156,
          completedOrders: 180,
          level: 3,
        },
      },
      bankDetails: {
        create: {
          bankName: 'FNB',
          accountHolder: 'John Smith',
          accountNumber: '62000000001',
          branchCode: '250655',
          accountType: 'SAVINGS',
          isVerified: true,
        },
      },
    },
    include: { sellerProfile: true },
  });

  const sellerUser2 = await prisma.user.create({
    data: {
      email: 'sarah@example.com',
      username: 'sarahdev',
      passwordHash,
      firstName: 'Sarah',
      lastName: 'Johnson',
      isEmailVerified: true,
      isSeller: true,
      roles: {
        create: [{ role: 'SELLER' }],
      },
      sellerProfile: {
        create: {
          displayName: 'Sarah Tech Solutions',
          professionalTitle: 'Full Stack Developer',
          description: 'Full stack developer specializing in React, Node.js, and cloud technologies. I build scalable web applications and provide ongoing maintenance and support.',
          skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'AWS', 'Docker'],
          languages: [
            { language: 'English', proficiency: 'NATIVE' },
          ],
          isVerified: true,
          responseTimeMinutes: 30,
          onTimeDeliveryRate: 100,
          rating: 5.0,
          reviewCount: 89,
          completedOrders: 95,
          level: 3,
        },
      },
      bankDetails: {
        create: {
          bankName: 'Standard Bank',
          accountHolder: 'Sarah Johnson',
          accountNumber: '012345678',
          branchCode: '051001',
          accountType: 'CURRENT',
          isVerified: true,
        },
      },
    },
    include: { sellerProfile: true },
  });

  const buyerUser = await prisma.user.create({
    data: {
      email: 'buyer@example.com',
      username: 'buyeruser',
      passwordHash,
      firstName: 'Mike',
      lastName: 'Wilson',
      isEmailVerified: true,
    },
  });

  console.log('✅ Created users (admin, 2 sellers, 1 buyer)');

  // Create services
  const service1 = await prisma.service.create({
    data: {
      title: 'I will design a professional logo for your business',
      slug: 'professional-logo-design-business',
      description: `Are you looking for a unique and memorable logo for your business? You've come to the right place!

I am a professional logo designer with over 10 years of experience creating stunning brand identities for businesses of all sizes.

**What you'll get:**
- Unique, custom logo design
- Multiple initial concepts
- Unlimited revisions until you're satisfied
- High-resolution files (PNG, JPG, SVG, PDF)
- Full ownership rights

**My design process:**
1. Understanding your brand and requirements
2. Research and concept development
3. Initial design concepts
4. Revisions based on your feedback
5. Final delivery with all file formats

I specialize in minimalist, modern, and vintage logo styles. Every logo I create is 100% original and tailored specifically to your brand.

**Industries I've worked with:**
- Technology & Startups
- Food & Beverage
- Fashion & Beauty
- Real Estate
- Healthcare
- Finance

Let's create something amazing together!`,
      categoryId: categories[0].id,
      sellerId: sellerUser1.id,
      pricingType: 'BOTH',
      tags: ['logo', 'branding', 'design', 'business', 'professional'],
      status: 'ACTIVE',
      isActive: true,
      viewCount: 1250,
      orderCount: 45,
      rating: 4.9,
      reviewCount: 38,
      images: [
        'https://picsum.photos/seed/logo1/800/600',
        'https://picsum.photos/seed/logo2/800/600',
        'https://picsum.photos/seed/logo3/800/600',
      ],
      faqs: [
        { question: 'What file formats do you provide?', answer: 'I provide PNG, JPG, SVG, PDF, and source files (AI, PSD) depending on the package you choose.' },
        { question: 'How many revisions do I get?', answer: 'Basic package includes 2 revisions. Standard and Premium packages include unlimited revisions until you are 100% satisfied.' },
        { question: 'Can you match a specific style?', answer: 'Absolutely! Just share your references and I will create something similar while keeping it unique to your brand.' },
      ],
      packages: {
        create: [
          {
            tier: 'BASIC',
            name: 'Starter',
            description: '1 concept, 2 revisions, PNG & JPG files',
            price: 500,
            deliveryDays: 5,
            revisions: 2,
            features: ['1 logo concept', '2 revisions', 'PNG & JPG files', 'Basic support'],
          },
          {
            tier: 'STANDARD',
            name: 'Professional',
            description: '3 concepts, unlimited revisions, all file formats, source files',
            price: 1200,
            deliveryDays: 4,
            revisions: -1,
            features: ['3 logo concepts', 'Unlimited revisions', 'All file formats', 'Source files (AI, PSD)', 'Priority support'],
          },
          {
            tier: 'PREMIUM',
            name: 'Enterprise',
            description: '5 concepts, brand guide, social media kit, stationery design',
            price: 2500,
            deliveryDays: 7,
            revisions: -1,
            features: ['5 logo concepts', 'Unlimited revisions', 'All file formats', 'Source files', 'Brand style guide', 'Social media kit', 'Business card design', 'Letterhead design', 'Dedicated support'],
          },
        ],
      },
      subscriptionTiers: {
        create: [
          {
            name: 'Monthly Design Support',
            description: 'Ongoing design support for your brand',
            price: 3000,
            interval: 'MONTHLY',
            payFastFrequency: 3,
            features: ['Up to 5 design tasks per month', 'Logo variations', 'Social media graphics', 'Priority support', '48-hour turnaround'],
          },
        ],
      },
    },
  });

  const service2 = await prisma.service.create({
    data: {
      title: 'I will develop a modern React website for your business',
      slug: 'modern-react-website-development',
      description: `Need a fast, modern, and responsive website? I will build you a stunning React website that converts visitors into customers.

**What I offer:**
- Custom React.js development
- Responsive design (mobile-first)
- SEO optimization
- Performance optimization
- Clean, maintainable code

**Technologies I use:**
- React.js / Next.js
- TypeScript
- TailwindCSS
- Node.js backend
- PostgreSQL / MongoDB

**What's included:**
- Modern UI/UX design implementation
- Contact forms
- Analytics integration
- Social media integration
- Basic SEO setup
- 30-day support after delivery

**My process:**
1. Requirements gathering
2. Design mockups (if needed)
3. Development
4. Testing & QA
5. Deployment
6. Handover & training

I have 8+ years of experience building web applications for startups and enterprises. Let's build something great together!`,
      categoryId: categories[1].id,
      sellerId: sellerUser2.id,
      pricingType: 'BOTH',
      tags: ['react', 'website', 'development', 'frontend', 'nodejs'],
      status: 'ACTIVE',
      isActive: true,
      viewCount: 890,
      orderCount: 28,
      rating: 5.0,
      reviewCount: 24,
      images: [
        'https://picsum.photos/seed/web1/800/600',
        'https://picsum.photos/seed/web2/800/600',
        'https://picsum.photos/seed/web3/800/600',
      ],
      faqs: [
        { question: 'What technologies do you use?', answer: 'I primarily use React.js or Next.js for the frontend, with Node.js and PostgreSQL for the backend. I can also work with other technologies based on your needs.' },
        { question: 'Do you provide hosting?', answer: 'Yes! I can deploy your website to Vercel, Netlify, AWS, or any other hosting provider of your choice. Hosting costs are separate from development costs.' },
        { question: 'Can you work with my existing design?', answer: 'Absolutely! I can implement designs from Figma, Sketch, or Adobe XD. If you do not have a design, I can also create one for an additional fee.' },
      ],
      packages: {
        create: [
          {
            tier: 'BASIC',
            name: 'Landing Page',
            description: 'Single page website, perfect for startups',
            price: 2500,
            deliveryDays: 7,
            revisions: 2,
            features: ['1 page website', 'Responsive design', 'Contact form', 'SEO basics', '2 revisions'],
          },
          {
            tier: 'STANDARD',
            name: 'Business Website',
            description: '5-page website with CMS',
            price: 6000,
            deliveryDays: 14,
            revisions: 5,
            features: ['Up to 5 pages', 'Responsive design', 'Content management', 'Contact form', 'SEO optimization', 'Analytics', '5 revisions', '30-day support'],
          },
          {
            tier: 'PREMIUM',
            name: 'Full Web Application',
            description: 'Custom web application with backend',
            price: 15000,
            deliveryDays: 30,
            revisions: -1,
            features: ['Unlimited pages', 'Custom functionality', 'User authentication', 'Database integration', 'Admin dashboard', 'API development', 'Unlimited revisions', '60-day support', 'Deployment included'],
          },
        ],
      },
      subscriptionTiers: {
        create: [
          {
            name: 'Website Maintenance',
            description: 'Ongoing website maintenance and updates',
            price: 2000,
            interval: 'MONTHLY',
            payFastFrequency: 3,
            features: ['Bug fixes', 'Security updates', 'Content updates (up to 5)', 'Performance monitoring', 'Monthly reports', 'Priority support'],
          },
          {
            name: 'Development Retainer',
            description: 'Dedicated development hours',
            price: 12000,
            interval: 'MONTHLY',
            payFastFrequency: 3,
            features: ['20 hours of development', 'New feature development', 'Bug fixes', 'Code reviews', 'Technical consulting', 'Slack support'],
          },
        ],
      },
    },
  });

  const service3 = await prisma.service.create({
    data: {
      title: 'I will manage your social media accounts professionally',
      slug: 'professional-social-media-management',
      description: `Grow your brand with professional social media management!

I will help you build a strong online presence and engage with your audience across all major platforms.

**Platforms I manage:**
- Instagram
- Facebook
- Twitter/X
- LinkedIn
- TikTok

**What you'll get:**
- Custom content creation
- Daily posting schedule
- Engagement management
- Community building
- Monthly analytics reports
- Trend monitoring
- Hashtag research

**My approach:**
1. Brand audit & competitor analysis
2. Content strategy development
3. Content calendar creation
4. Daily posting & engagement
5. Weekly performance reviews
6. Monthly detailed reports

I have helped over 50 businesses grow their social media presence and increase engagement by an average of 300%.`,
      categoryId: categories[2].id,
      sellerId: sellerUser1.id,
      pricingType: 'SUBSCRIPTION',
      tags: ['social media', 'marketing', 'instagram', 'facebook', 'content'],
      status: 'ACTIVE',
      isActive: true,
      viewCount: 650,
      orderCount: 15,
      rating: 4.8,
      reviewCount: 12,
      images: [
        'https://picsum.photos/seed/social1/800/600',
        'https://picsum.photos/seed/social2/800/600',
      ],
      faqs: [
        { question: 'Which platforms do you manage?', answer: 'I manage Instagram, Facebook, Twitter/X, LinkedIn, and TikTok. I can also help with YouTube and Pinterest for enterprise clients.' },
        { question: 'Do you create the content?', answer: 'Yes! I create all graphics, write captions, and schedule posts. You just need to provide general direction and approve the content calendar.' },
        { question: 'How do you measure success?', answer: 'I track key metrics like follower growth, engagement rate, reach, and website clicks. You will receive detailed reports showing your progress.' },
      ],
      subscriptionTiers: {
        create: [
          {
            name: 'Starter',
            description: 'Perfect for small businesses',
            price: 2500,
            interval: 'MONTHLY',
            payFastFrequency: 3,
            features: ['2 platforms', '10 posts per month', 'Basic engagement', 'Monthly report', 'Email support'],
            limits: { platforms: 2, postsPerMonth: 10 },
          },
          {
            name: 'Growth',
            description: 'For growing businesses',
            price: 5000,
            interval: 'MONTHLY',
            payFastFrequency: 3,
            features: ['4 platforms', '20 posts per month', 'Daily engagement', 'Stories & Reels', 'Weekly reports', 'Priority support'],
            limits: { platforms: 4, postsPerMonth: 20 },
          },
          {
            name: 'Enterprise',
            description: 'Full-service management',
            price: 10000,
            interval: 'MONTHLY',
            payFastFrequency: 3,
            features: ['All platforms', 'Unlimited posts', '24/7 engagement', 'Influencer outreach', 'Paid ads management', 'Dedicated manager', 'Daily reports'],
            limits: { platforms: -1, postsPerMonth: -1 },
          },
        ],
      },
    },
  });

  // Create more diverse services
  const additionalServices = await Promise.all([
    // Graphics & Design
    prisma.service.create({
      data: {
        title: 'I will create stunning brand identity packages',
        slug: 'brand-identity-package-design',
        description: 'Complete brand identity design including logo, color palette, typography, brand guidelines, and stationery.',
        categoryId: categories[0].id,
        sellerId: sellerUser1.id,
        pricingType: 'ONE_TIME',
        tags: ['branding', 'logo', 'identity', 'design'],
        status: 'ACTIVE',
        isActive: true,
        viewCount: 890,
        orderCount: 34,
        rating: 4.95,
        reviewCount: 28,
        images: ['https://picsum.photos/seed/brand1/800/600', 'https://picsum.photos/seed/brand2/800/600'],
        faqs: [{ question: 'What deliverables are included?', answer: 'Logo files, brand style guide, color palette, typography guide, business card design, letterhead, and email signature.' }],
        packages: {
          create: [
            { tier: 'BASIC', name: 'Essential', description: 'Logo + basic brand guide', price: 2000, deliveryDays: 7, revisions: 3, features: ['Logo design', 'Basic brand guide', '3 revisions'] },
            { tier: 'STANDARD', name: 'Professional', description: 'Complete brand identity', price: 4500, deliveryDays: 10, revisions: 5, features: ['Logo design', 'Full brand guide', 'Stationery design', '5 revisions'] },
            { tier: 'PREMIUM', name: 'Enterprise', description: 'Full brand system', price: 8000, deliveryDays: 14, revisions: -1, features: ['Complete brand system', 'Brand guidelines', 'Stationery suite', 'Social media templates', 'Unlimited revisions'] },
          ],
        },
      },
    }),
    prisma.service.create({
      data: {
        title: 'I will design eye-catching social media graphics',
        slug: 'social-media-graphics-design',
        description: 'Professional social media graphics for Instagram, Facebook, Twitter, and LinkedIn. Boost engagement with stunning visuals.',
        categoryId: categories[0].id,
        sellerId: sellerUser1.id,
        pricingType: 'BOTH',
        tags: ['social media', 'graphics', 'instagram', 'design'],
        status: 'ACTIVE',
        isActive: true,
        viewCount: 720,
        orderCount: 48,
        rating: 4.9,
        reviewCount: 41,
        images: ['https://picsum.photos/seed/socgraphics/800/600'],
        packages: {
          create: [
            { tier: 'BASIC', name: '5 Posts', description: '5 custom graphics', price: 500, deliveryDays: 3, revisions: 2, features: ['5 custom posts', 'Instagram optimized', '2 revisions'] },
            { tier: 'STANDARD', name: '15 Posts', description: '15 posts + stories', price: 1200, deliveryDays: 5, revisions: 3, features: ['15 posts', 'Stories templates', 'Multi-platform', '3 revisions'] },
            { tier: 'PREMIUM', name: '30 Posts', description: 'Full month content', price: 2000, deliveryDays: 7, revisions: 5, features: ['30 posts', 'Stories + Reels covers', 'All platforms', 'Editable templates', '5 revisions'] },
          ],
        },
        subscriptionTiers: {
          create: [{
            name: 'Monthly Graphics',
            description: 'Ongoing social graphics',
            price: 1800,
            interval: 'MONTHLY',
            payFastFrequency: 3,
            features: ['20 posts per month', 'Stories templates', 'Priority delivery', '48h turnaround'],
          }],
        },
      },
    }),
    
    // Programming & Tech
    prisma.service.create({
      data: {
        title: 'I will build a custom e-commerce store with Shopify',
        slug: 'custom-shopify-store-development',
        description: 'Professional Shopify store setup with custom theme, payment integration, and product upload. Perfect for SA businesses.',
        categoryId: categories[1].id,
        sellerId: sellerUser2.id,
        pricingType: 'ONE_TIME',
        tags: ['shopify', 'ecommerce', 'development', 'online store'],
        status: 'ACTIVE',
        isActive: true,
        viewCount: 1100,
        orderCount: 22,
        rating: 5.0,
        reviewCount: 20,
        images: ['https://picsum.photos/seed/shopify1/800/600', 'https://picsum.photos/seed/shopify2/800/600'],
        packages: {
          create: [
            { tier: 'BASIC', name: 'Starter Store', description: 'Basic Shopify setup', price: 3500, deliveryDays: 7, revisions: 2, features: ['Theme setup', 'Up to 20 products', 'Payment gateway', 'Basic SEO'] },
            { tier: 'STANDARD', name: 'Business Store', description: 'Complete store setup', price: 7000, deliveryDays: 10, revisions: 4, features: ['Custom theme', 'Up to 100 products', 'All integrations', 'Advanced SEO', 'Training'] },
            { tier: 'PREMIUM', name: 'Enterprise', description: 'Full custom solution', price: 15000, deliveryDays: 21, revisions: -1, features: ['Fully custom theme', 'Unlimited products', 'Custom apps', 'Marketing setup', '30-day support'] },
          ],
        },
      },
    }),
    prisma.service.create({
      data: {
        title: 'I will develop a mobile app for iOS and Android',
        slug: 'react-native-mobile-app-development',
        description: 'Cross-platform mobile app development using React Native. One codebase, both platforms. Fast, reliable, and scalable.',
        categoryId: categories[1].id,
        sellerId: sellerUser2.id,
        pricingType: 'ONE_TIME',
        tags: ['mobile app', 'react native', 'ios', 'android', 'development'],
        status: 'ACTIVE',
        isActive: true,
        viewCount: 950,
        orderCount: 12,
        rating: 4.95,
        reviewCount: 11,
        images: ['https://picsum.photos/seed/mobileapp/800/600'],
        packages: {
          create: [
            { tier: 'BASIC', name: 'Simple App', description: 'Basic 5-screen app', price: 10000, deliveryDays: 21, revisions: 2, features: ['5 screens', 'Basic features', 'iOS + Android', '2 revisions'] },
            { tier: 'STANDARD', name: 'Business App', description: 'Full-featured app', price: 25000, deliveryDays: 45, revisions: 5, features: ['10+ screens', 'Backend integration', 'Push notifications', 'Analytics', '5 revisions'] },
            { tier: 'PREMIUM', name: 'Enterprise App', description: 'Complex app solution', price: 50000, deliveryDays: 60, revisions: -1, features: ['Unlimited screens', 'Custom backend', 'Real-time features', 'Admin panel', 'Unlimited revisions', '60-day support'] },
          ],
        },
      },
    }),
    
    // Digital Marketing
    prisma.service.create({
      data: {
        title: 'I will optimize your website for Google SEO',
        slug: 'complete-google-seo-optimization',
        description: 'Complete SEO optimization for South African businesses. Rank higher on Google, get more organic traffic.',
        categoryId: categories[2].id,
        sellerId: sellerUser1.id,
        pricingType: 'ONE_TIME',
        tags: ['seo', 'google', 'optimization', 'marketing'],
        status: 'ACTIVE',
        isActive: true,
        viewCount: 880,
        orderCount: 38,
        rating: 4.85,
        reviewCount: 32,
        images: ['https://picsum.photos/seed/seo1/800/600'],
        packages: {
          create: [
            { tier: 'BASIC', name: 'SEO Audit', description: 'Comprehensive site audit', price: 800, deliveryDays: 3, revisions: 0, features: ['Full SEO audit', 'Keyword research', 'Detailed report', 'Recommendations'] },
            { tier: 'STANDARD', name: 'SEO Optimization', description: 'Full on-page optimization', price: 2500, deliveryDays: 7, revisions: 2, features: ['On-page optimization', 'Meta tags', 'Technical SEO', 'Schema markup', 'Content optimization'] },
            { tier: 'PREMIUM', name: 'Complete SEO', description: 'Full SEO campaign', price: 6000, deliveryDays: 14, revisions: 4, features: ['Everything in Standard', 'Link building', 'Local SEO', 'Google My Business', 'Monthly maintenance'] },
          ],
        },
      },
    }),
    prisma.service.create({
      data: {
        title: 'I will run Google Ads campaigns for your business',
        slug: 'google-ads-campaign-management',
        description: 'Professional Google Ads management. Drive targeted traffic, maximize ROI, and grow your business with data-driven campaigns.',
        categoryId: categories[2].id,
        sellerId: sellerUser2.id,
        pricingType: 'SUBSCRIPTION',
        tags: ['google ads', 'ppc', 'advertising', 'marketing'],
        status: 'ACTIVE',
        isActive: true,
        viewCount: 670,
        orderCount: 18,
        rating: 4.9,
        reviewCount: 15,
        images: ['https://picsum.photos/seed/googleads/800/600'],
        subscriptionTiers: {
          create: [
            {
              name: 'Starter',
              description: 'Small campaigns',
              price: 1500,
              interval: 'MONTHLY',
              payFastFrequency: 3,
              features: ['Up to R5000 ad spend', 'Setup & optimization', 'Weekly reports', 'Email support'],
            },
            {
              name: 'Growth',
              description: 'Medium campaigns',
              price: 3500,
              interval: 'MONTHLY',
              payFastFrequency: 3,
              features: ['Up to R20000 ad spend', 'Advanced optimization', 'A/B testing', 'Bi-weekly reports', 'Priority support'],
            },
            {
              name: 'Enterprise',
              description: 'Large campaigns',
              price: 8000,
              interval: 'MONTHLY',
              payFastFrequency: 3,
              features: ['Unlimited ad spend', 'Full account management', 'Advanced tracking', 'Weekly calls', 'Dedicated manager'],
            },
          ],
        },
      },
    }),
    
    // Writing & Translation
    prisma.service.create({
      data: {
        title: 'I will write engaging blog posts and articles',
        slug: 'professional-blog-article-writing',
        description: 'SEO-optimized blog posts and articles written by an experienced South African copywriter. Engage your audience and rank higher.',
        categoryId: categories[3].id,
        sellerId: sellerUser1.id,
        pricingType: 'BOTH',
        tags: ['writing', 'blog', 'content', 'seo', 'articles'],
        status: 'ACTIVE',
        isActive: true,
        viewCount: 740,
        orderCount: 56,
        rating: 4.95,
        reviewCount: 48,
        images: ['https://picsum.photos/seed/writing1/800/600'],
        packages: {
          create: [
            { tier: 'BASIC', name: '500 words', description: 'Short blog post', price: 300, deliveryDays: 2, revisions: 1, features: ['500 words', 'SEO optimized', '1 revision', 'Plagiarism check'] },
            { tier: 'STANDARD', name: '1000 words', description: 'Medium article', price: 550, deliveryDays: 3, revisions: 2, features: ['1000 words', 'SEO optimized', 'Meta description', '2 revisions', 'Image suggestions'] },
            { tier: 'PREMIUM', name: '2000 words', description: 'Long-form content', price: 1000, deliveryDays: 5, revisions: 3, features: ['2000 words', 'Advanced SEO', 'Keywords research', 'Meta tags', '3 revisions', 'Topic ideation'] },
          ],
        },
        subscriptionTiers: {
          create: [{
            name: 'Content Package',
            description: 'Monthly blog writing',
            price: 2500,
            interval: 'MONTHLY',
            payFastFrequency: 3,
            features: ['8 articles per month', 'SEO optimization', 'Content calendar', 'Priority delivery'],
          }],
        },
      },
    }),
    prisma.service.create({
      data: {
        title: 'I will translate English to Afrikaans and vice versa',
        slug: 'english-afrikaans-translation-services',
        description: 'Professional English-Afrikaans translation by a native bilingual speaker. Accurate, culturally appropriate, and fast delivery.',
        categoryId: categories[3].id,
        sellerId: sellerUser2.id,
        pricingType: 'ONE_TIME',
        tags: ['translation', 'afrikaans', 'english', 'bilingual'],
        status: 'ACTIVE',
        isActive: true,
        viewCount: 520,
        orderCount: 42,
        rating: 5.0,
        reviewCount: 38,
        images: ['https://picsum.photos/seed/translation/800/600'],
        packages: {
          create: [
            { tier: 'BASIC', name: 'Up to 500 words', description: 'Short translation', price: 250, deliveryDays: 2, revisions: 1, features: ['Up to 500 words', 'Proofread', '1 revision', '24h delivery'] },
            { tier: 'STANDARD', name: 'Up to 1500 words', description: 'Standard translation', price: 600, deliveryDays: 3, revisions: 2, features: ['Up to 1500 words', 'Proofread', 'Cultural adaptation', '2 revisions'] },
            { tier: 'PREMIUM', name: 'Up to 5000 words', description: 'Long translation', price: 1800, deliveryDays: 5, revisions: 3, features: ['Up to 5000 words', 'Professional proofread', 'Cultural consulting', '3 revisions', 'Certification available'] },
          ],
        },
      },
    }),
    
    // Video & Animation
    prisma.service.create({
      data: {
        title: 'I will edit your videos professionally',
        slug: 'professional-video-editing-service',
        description: 'Professional video editing for YouTube, social media, corporate videos, and more. Fast turnaround, unlimited revisions.',
        categoryId: categories[4].id,
        sellerId: sellerUser2.id,
        pricingType: 'ONE_TIME',
        tags: ['video editing', 'youtube', 'social media', 'corporate video'],
        status: 'ACTIVE',
        isActive: true,
        viewCount: 990,
        orderCount: 67,
        rating: 4.9,
        reviewCount: 58,
        images: ['https://picsum.photos/seed/videoediting/800/600'],
        packages: {
          create: [
            { tier: 'BASIC', name: 'Short Video', description: 'Up to 3 minutes', price: 600, deliveryDays: 3, revisions: 2, features: ['Up to 3 minutes', 'Basic editing', 'Color correction', 'Music', '2 revisions'] },
            { tier: 'STANDARD', name: 'Medium Video', description: 'Up to 10 minutes', price: 1500, deliveryDays: 5, revisions: 4, features: ['Up to 10 minutes', 'Advanced editing', 'Motion graphics', 'Sound design', '4 revisions'] },
            { tier: 'PREMIUM', name: 'Long Video', description: 'Up to 30 minutes', price: 3500, deliveryDays: 7, revisions: -1, features: ['Up to 30 minutes', 'Pro editing', 'Advanced VFX', 'Color grading', 'Sound mixing', 'Unlimited revisions'] },
          ],
        },
      },
    }),
    prisma.service.create({
      data: {
        title: 'I will create animated explainer videos',
        slug: 'animated-explainer-video-creation',
        description: 'Engaging animated explainer videos perfect for startups and businesses. Simplify complex ideas and boost conversions.',
        categoryId: categories[4].id,
        sellerId: sellerUser1.id,
        pricingType: 'ONE_TIME',
        tags: ['animation', 'explainer video', 'motion graphics', 'startup'],
        status: 'ACTIVE',
        isActive: true,
        viewCount: 850,
        orderCount: 28,
        rating: 4.85,
        reviewCount: 24,
        images: ['https://picsum.photos/seed/animation/800/600'],
        packages: {
          create: [
            { tier: 'BASIC', name: '30-second video', description: 'Short explainer', price: 2500, deliveryDays: 7, revisions: 2, features: ['30 seconds', 'Script included', 'Voiceover', 'Background music', '2 revisions'] },
            { tier: 'STANDARD', name: '60-second video', description: 'Standard explainer', price: 4500, deliveryDays: 10, revisions: 3, features: ['60 seconds', 'Custom illustrations', 'Professional voiceover', 'Sound effects', '3 revisions'] },
            { tier: 'PREMIUM', name: '90-second video', description: 'Premium explainer', price: 7500, deliveryDays: 14, revisions: 5, features: ['90 seconds', 'Full custom animation', 'Character design', 'Multiple scenes', 'Subtitles', '5 revisions'] },
          ],
        },
      },
    }),
    
    // Music & Audio
    prisma.service.create({
      data: {
        title: 'I will provide professional voiceover in English and Afrikaans',
        slug: 'professional-voiceover-services',
        description: 'Broadcast-quality voiceover for ads, videos, audiobooks, and presentations. Native English and Afrikaans speaker.',
        categoryId: categories[5].id,
        sellerId: sellerUser1.id,
        pricingType: 'ONE_TIME',
        tags: ['voiceover', 'voice acting', 'audio', 'afrikaans', 'english'],
        status: 'ACTIVE',
        isActive: true,
        viewCount: 610,
        orderCount: 44,
        rating: 4.95,
        reviewCount: 39,
        images: ['https://picsum.photos/seed/voiceover/800/600'],
        packages: {
          create: [
            { tier: 'BASIC', name: 'Up to 100 words', description: 'Short voiceover', price: 400, deliveryDays: 2, revisions: 1, features: ['Up to 100 words', 'Broadcast quality', 'Commercial rights', '1 revision'] },
            { tier: 'STANDARD', name: 'Up to 300 words', description: 'Medium voiceover', price: 900, deliveryDays: 3, revisions: 2, features: ['Up to 300 words', 'Broadcast quality', 'Background music', 'Sound effects', '2 revisions'] },
            { tier: 'PREMIUM', name: 'Up to 1000 words', description: 'Long voiceover', price: 2500, deliveryDays: 5, revisions: 3, features: ['Up to 1000 words', 'Character voices', 'Full production', 'Sync to video', 'Source files', '3 revisions'] },
          ],
        },
      },
    }),
    prisma.service.create({
      data: {
        title: 'I will produce custom music and beats',
        slug: 'custom-music-production-beats',
        description: 'Original music production and beats for artists, content creators, and businesses. All genres, radio-ready quality.',
        categoryId: categories[5].id,
        sellerId: sellerUser2.id,
        pricingType: 'ONE_TIME',
        tags: ['music production', 'beats', 'original music', 'audio'],
        status: 'ACTIVE',
        isActive: true,
        viewCount: 560,
        orderCount: 31,
        rating: 4.8,
        reviewCount: 26,
        images: ['https://picsum.photos/seed/musicprod/800/600'],
        packages: {
          create: [
            { tier: 'BASIC', name: 'Beat Lease', description: 'Non-exclusive beat', price: 500, deliveryDays: 1, revisions: 0, features: ['Non-exclusive rights', 'MP3 + WAV', 'Basic mixing', 'Up to 5000 streams'] },
            { tier: 'STANDARD', name: 'Custom Beat', description: 'Made-to-order beat', price: 1500, deliveryDays: 5, revisions: 2, features: ['Custom made', 'Exclusive rights option', 'Full stems', 'Professional mixing', '2 revisions'] },
            { tier: 'PREMIUM', name: 'Full Production', description: 'Complete song production', price: 4000, deliveryDays: 10, revisions: 4, features: ['Full production', 'Exclusive rights', 'Mixing & mastering', 'All source files', 'Unlimited distribution', '4 revisions'] },
          ],
        },
      },
    }),
    
    // Business
    prisma.service.create({
      data: {
        title: 'I will be your professional virtual assistant',
        slug: 'professional-virtual-assistant-services',
        description: 'Reliable virtual assistant for admin tasks, email management, scheduling, and more. Save time and focus on growing your business.',
        categoryId: categories[6].id,
        sellerId: sellerUser1.id,
        pricingType: 'SUBSCRIPTION',
        tags: ['virtual assistant', 'admin', 'scheduling', 'business support'],
        status: 'ACTIVE',
        isActive: true,
        viewCount: 780,
        orderCount: 34,
        rating: 4.9,
        reviewCount: 29,
        images: ['https://picsum.photos/seed/va/800/600'],
        subscriptionTiers: {
          create: [
            {
              name: 'Part-Time',
              description: '10 hours per month',
              price: 1500,
              interval: 'MONTHLY',
              payFastFrequency: 3,
              features: ['10 hours per month', 'Email management', 'Scheduling', 'Data entry', 'Email support'],
            },
            {
              name: 'Standard',
              description: '20 hours per month',
              price: 2800,
              interval: 'MONTHLY',
              payFastFrequency: 3,
              features: ['20 hours per month', 'All part-time features', 'Social media posting', 'Research tasks', 'Priority support'],
            },
            {
              name: 'Full-Time',
              description: '40 hours per month',
              price: 5000,
              interval: 'MONTHLY',
              payFastFrequency: 3,
              features: ['40 hours per month', 'All standard features', 'Project management', 'Client communication', 'Dedicated assistant'],
            },
          ],
        },
      },
    }),
    prisma.service.create({
      data: {
        title: 'I will create a comprehensive business plan',
        slug: 'professional-business-plan-creation',
        description: 'Investor-ready business plans for startups and established businesses. Financial projections, market analysis, and strategy.',
        categoryId: categories[6].id,
        sellerId: sellerUser2.id,
        pricingType: 'ONE_TIME',
        tags: ['business plan', 'startup', 'investor', 'strategy'],
        status: 'ACTIVE',
        isActive: true,
        viewCount: 450,
        orderCount: 19,
        rating: 5.0,
        reviewCount: 17,
        images: ['https://picsum.photos/seed/bizplan/800/600'],
        packages: {
          create: [
            { tier: 'BASIC', name: 'Startup Plan', description: 'Essential business plan', price: 3000, deliveryDays: 7, revisions: 2, features: ['10-15 pages', 'Market analysis', 'Financial projections', 'SWOT analysis', '2 revisions'] },
            { tier: 'STANDARD', name: 'Growth Plan', description: 'Comprehensive plan', price: 6000, deliveryDays: 10, revisions: 3, features: ['20-30 pages', 'Detailed market research', '5-year projections', 'Competitor analysis', 'Pitch deck', '3 revisions'] },
            { tier: 'PREMIUM', name: 'Investor Plan', description: 'Full investor-ready plan', price: 12000, deliveryDays: 14, revisions: 5, features: ['30-50 pages', 'Investor-ready format', 'Detailed financials', 'Exit strategy', 'Executive summary', 'Pitch deck', '5 revisions', 'Consultation call'] },
          ],
        },
      },
    }),
  ]);

  console.log(`✅ Created ${3 + additionalServices.length} services across all categories`);

  // Create seller pipeline stages
  await prisma.pipelineStage.createMany({
    data: [
      { userId: sellerUser1.id, name: 'New Lead', color: '#3B82F6', order: 0 },
      { userId: sellerUser1.id, name: 'Qualified', color: '#8B5CF6', order: 1 },
      { userId: sellerUser1.id, name: 'Proposal Sent', color: '#F59E0B', order: 2 },
      { userId: sellerUser1.id, name: 'Negotiating', color: '#EC4899', order: 3 },
      { userId: sellerUser1.id, name: 'Won', color: '#10B981', order: 4 },
      { userId: sellerUser1.id, name: 'Lost', color: '#EF4444', order: 5 },
      { userId: sellerUser2.id, name: 'New Inquiry', color: '#3B82F6', order: 0 },
      { userId: sellerUser2.id, name: 'Discovery Call', color: '#8B5CF6', order: 1 },
      { userId: sellerUser2.id, name: 'Proposal', color: '#F59E0B', order: 2 },
      { userId: sellerUser2.id, name: 'Closed', color: '#10B981', order: 3 },
    ],
  });

  // Create seller labels
  await prisma.label.createMany({
    data: [
      { userId: sellerUser1.id, name: 'VIP Client', color: '#F59E0B' },
      { userId: sellerUser1.id, name: 'Urgent', color: '#EF4444' },
      { userId: sellerUser1.id, name: 'Follow Up', color: '#3B82F6' },
      { userId: sellerUser2.id, name: 'Enterprise', color: '#8B5CF6' },
      { userId: sellerUser2.id, name: 'Startup', color: '#10B981' },
      { userId: sellerUser2.id, name: 'Recurring', color: '#EC4899' },
    ],
  });

  // Create saved replies
  await prisma.savedReply.createMany({
    data: [
      {
        userId: sellerUser1.id,
        shortcut: '/thanks',
        title: 'Thank You',
        content: 'Thank you for your message! I appreciate your interest in my services. Let me review your requirements and get back to you within 24 hours.',
      },
      {
        userId: sellerUser1.id,
        shortcut: '/pricing',
        title: 'Pricing Info',
        content: 'Thank you for asking about pricing! You can find all my packages and pricing on the service page. If you need a custom quote, please share your requirements and I will prepare one for you.',
      },
      {
        userId: sellerUser2.id,
        shortcut: '/timeline',
        title: 'Project Timeline',
        content: 'Great question! The timeline depends on the scope of your project. For a basic website, it typically takes 1-2 weeks. For more complex applications, it can take 4-8 weeks. Let\'s discuss your specific needs to give you an accurate estimate.',
      },
    ],
  });

  console.log('✅ Created CRM data (pipeline stages, labels, saved replies)');

  // Create a sample conversation
  const conversation = await prisma.conversation.create({
    data: {
      buyerId: buyerUser.id,
      sellerId: sellerUser1.id,
      source: `service:${service1.id}`,
      lastMessageAt: new Date(),
      messages: {
        create: [
          {
            senderId: buyerUser.id,
            content: 'Hi! I\'m interested in getting a logo designed for my new tech startup. Can you help?',
            type: 'TEXT',
            createdAt: new Date(Date.now() - 3600000),
          },
          {
            senderId: sellerUser1.id,
            content: 'Hello! Thank you for reaching out. I\'d love to help with your logo. Could you tell me more about your startup? What industry are you in, and do you have any style preferences?',
            type: 'TEXT',
            createdAt: new Date(Date.now() - 3000000),
          },
          {
            senderId: buyerUser.id,
            content: 'We\'re building a SaaS platform for project management. I\'m looking for something modern and minimal, maybe with a geometric shape. Our brand colors are blue and white.',
            type: 'TEXT',
            createdAt: new Date(Date.now() - 2400000),
          },
          {
            senderId: sellerUser1.id,
            content: 'Perfect! That sounds right up my alley. I recommend the Standard package - you\'ll get 3 concepts to choose from and unlimited revisions. Would you like me to send you a custom offer?',
            type: 'TEXT',
            createdAt: new Date(Date.now() - 1800000),
          },
        ],
      },
    },
  });

  console.log('✅ Created sample conversation');

  // Create sample courses
  const course1 = await prisma.course.create({
    data: {
      title: 'Master Modern Logo Design from Scratch',
      slug: 'master-modern-logo-design',
      description: 'Learn the complete process of designing professional logos — from concept sketching to final delivery. This course covers typography, color theory, iconography, and client presentation techniques used by top designers.',

      price: 499,
      level: 'BEGINNER',
      status: 'PUBLISHED',
      categoryId: categories[0].id,
      sellerId: sellerUser1.sellerProfile!.id,
      thumbnail: 'https://picsum.photos/seed/course-logo/800/450',
      learnings: [
        'Design professional logos from scratch',
        'Understand color theory and typography',
        'Present designs to clients effectively',
        'Use Adobe Illustrator for logo work',
        'Build a logo design portfolio',
      ],
      requirements: [
        'No prior design experience needed',
        'A computer with internet access',
        'Adobe Illustrator (free trial is fine)',
      ],
      tags: ['logo design', 'branding', 'graphic design', 'illustrator'],
      totalDuration: 18000,
      publishedAt: new Date(),
      sections: {
        create: [
          {
            title: 'Getting Started with Logo Design',
            order: 0,
            lessons: {
              create: [
                { title: 'Welcome & Course Overview', duration: 300, order: 0, description: 'Welcome to the course!' },
                { title: 'What Makes a Great Logo?', duration: 600, order: 1, description: 'Exploring the fundamentals of great logo design.' },
                { title: 'Tools You Will Need', duration: 480, order: 2, description: 'Setting up your design workspace.' },
              ],
            },
          },
          {
            title: 'Design Fundamentals',
            order: 1,
            lessons: {
              create: [
                { title: 'Color Theory for Logos', duration: 900, order: 0, description: 'Understanding how color impacts branding.' },
                { title: 'Typography Essentials', duration: 720, order: 1, description: 'Choosing and pairing fonts for logos.' },
                { title: 'Shape Psychology in Design', duration: 600, order: 2, description: 'How shapes influence perception.' },
              ],
            },
          },
          {
            title: 'Building Your First Logo',
            order: 2,
            lessons: {
              create: [
                { title: 'Concept Sketching Techniques', duration: 1200, order: 0, description: 'Brainstorming and sketching logo concepts.' },
                { title: 'From Sketch to Vector', duration: 1500, order: 1, description: 'Digitizing your sketches in Illustrator.' },
                { title: 'Final Polish & Export', duration: 900, order: 2, description: 'Refining and exporting your logo.' },
                { title: 'Presenting to Clients', duration: 600, order: 3, description: 'Creating professional mockups and presentations.' },
              ],
            },
          },
        ],
      },
    },
  });

  const course2 = await prisma.course.create({
    data: {
      title: 'Build Full-Stack Web Apps with React & Node.js',
      slug: 'fullstack-react-nodejs',
      description: 'Go from zero to deploying a production-ready full-stack web application. This comprehensive course covers React for the frontend, Node.js/Express for the backend, PostgreSQL for the database, and deployment to the cloud.',
      price: 799,
      level: 'INTERMEDIATE',
      status: 'PUBLISHED',
      categoryId: categories[1].id,
      sellerId: sellerUser2.sellerProfile!.id,
      thumbnail: 'https://picsum.photos/seed/course-react/800/450',
      learnings: [
        'Build complete React frontends with TypeScript',
        'Create REST APIs with Node.js and Express',
        'Design and query PostgreSQL databases',
        'Implement authentication and authorization',
        'Deploy applications to production',
        'Write tests and follow best practices',
      ],
      requirements: [
        'Basic HTML, CSS, and JavaScript knowledge',
        'A computer with Node.js installed',
        'Familiarity with the command line',
      ],
      tags: ['react', 'nodejs', 'typescript', 'fullstack', 'web development'],
      totalDuration: 36000,
      publishedAt: new Date(),
      sections: {
        create: [
          {
            title: 'Project Setup & Architecture',
            order: 0,
            lessons: {
              create: [
                { title: 'Course Introduction', duration: 300, order: 0, description: 'What we will build together.' },
                { title: 'Project Architecture Overview', duration: 600, order: 1, description: 'Understanding the full-stack architecture.' },
                { title: 'Setting Up the Monorepo', duration: 900, order: 2, description: 'Configuring the development environment.' },
              ],
            },
          },
          {
            title: 'Backend with Node.js & Express',
            order: 1,
            lessons: {
              create: [
                { title: 'Express Server Setup', duration: 1200, order: 0, description: 'Creating the Express application.' },
                { title: 'Database Design with Prisma', duration: 1500, order: 1, description: 'Modeling data with Prisma ORM.' },
                { title: 'Building REST Endpoints', duration: 1800, order: 2, description: 'Creating CRUD API routes.' },
                { title: 'Authentication & JWT', duration: 1500, order: 3, description: 'Implementing secure authentication.' },
              ],
            },
          },
          {
            title: 'Frontend with React & TypeScript',
            order: 2,
            lessons: {
              create: [
                { title: 'React Project Structure', duration: 900, order: 0, description: 'Organizing a scalable React app.' },
                { title: 'State Management with Zustand', duration: 1200, order: 1, description: 'Managing application state.' },
                { title: 'Building the UI Components', duration: 1800, order: 2, description: 'Creating reusable components with Tailwind.' },
                { title: 'Connecting to the API', duration: 1200, order: 3, description: 'Using React Query for data fetching.' },
              ],
            },
          },
          {
            title: 'Deployment & Production',
            order: 3,
            lessons: {
              create: [
                { title: 'Testing Your Application', duration: 1200, order: 0, description: 'Writing unit and integration tests.' },
                { title: 'Docker & CI/CD', duration: 1500, order: 1, description: 'Containerizing and automating deployments.' },
                { title: 'Deploying to Production', duration: 900, order: 2, description: 'Going live with your app.' },
              ],
            },
          },
        ],
      },
    },
  });

  // Create more diverse courses
  const additionalCourses = await Promise.all([
    prisma.course.create({
      data: {
        title: 'Complete Digital Marketing Masterclass',
        slug: 'complete-digital-marketing-masterclass',
        description: 'Master digital marketing with this comprehensive course covering SEO, social media, email marketing, and paid advertising.',
        price: 699,
        level: 'INTERMEDIATE',
        status: 'PUBLISHED',
        categoryId: categories[2].id,
        sellerId: sellerUser1.sellerProfile!.id,
        thumbnail: 'https://picsum.photos/seed/course-marketing/800/450',
        learnings: ['Run successful ad campaigns', 'Master SEO fundamentals', 'Grow social media presence', 'Build email marketing funnels', 'Analyze marketing data'],
        requirements: ['Basic computer skills', 'Internet access', 'Willingness to learn'],
        tags: ['digital marketing', 'seo', 'social media', 'advertising'],
        totalDuration: 24000,
        rating: 4.7,
        reviewCount: 45,
        enrollCount: 287,
        publishedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        sections: {
          create: [
            {
              title: 'Introduction to Digital Marketing',
              order: 0,
              lessons: {
                create: [
                  { title: 'What is Digital Marketing?', duration: 480, order: 0, description: 'Overview of digital marketing landscape.' },
                  { title: 'Setting Up Your Marketing Stack', duration: 720, order: 1, description: 'Essential tools and platforms.' },
                ],
              },
            },
            {
              title: 'SEO Fundamentals',
              order: 1,
              lessons: {
                create: [
                  { title: 'Keyword Research', duration: 900, order: 0, description: 'Finding profitable keywords.' },
                  { title: 'On-Page Optimization', duration: 1200, order: 1, description: 'Optimizing your content.' },
                  { title: 'Link Building Strategies', duration: 960, order: 2, description: 'Building authority.' },
                ],
              },
            },
          ],
        },
      },
    }),
    prisma.course.create({
      data: {
        title: 'Shopify Store Mastery: Build & Launch Your Store',
        slug: 'shopify-store-mastery',
        description: 'Complete guide to building a profitable Shopify store from scratch. No coding required!',
        price: 599,
        level: 'BEGINNER',
        status: 'PUBLISHED',
        categoryId: categories[1].id,
        sellerId: sellerUser2.sellerProfile!.id,
        thumbnail: 'https://picsum.photos/seed/course-shopify/800/450',
        learnings: ['Set up a Shopify store', 'Design a converting storefront', 'Find and add products', 'Process payments', 'Launch marketing campaigns'],
        requirements: ['Basic computer skills'],
        tags: ['shopify', 'ecommerce', 'online store', 'business'],
        totalDuration: 15600,
        rating: 4.85,
        reviewCount: 62,
        enrollCount: 412,
        publishedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
        sections: {
          create: [
            {
              title: 'Getting Started',
              order: 0,
              lessons: {
                create: [
                  { title: 'Setting Up Your Shopify Account', duration: 600, order: 0, description: 'Create and configure your store.' },
                  { title: 'Choosing the Perfect Theme', duration: 540, order: 1, description: 'Finding the right design.' },
                ],
              },
            },
          ],
        },
      },
    }),
    prisma.course.create({
      data: {
        title: 'Figma UI/UX Design Complete Course',
        slug: 'figma-ui-ux-design-complete',
        description: 'Learn modern UI/UX design with Figma. Create stunning interfaces and prototypes.',
        price: 549,
        level: 'BEGINNER',
        status: 'PUBLISHED',
        categoryId: categories[0].id,
        sellerId: sellerUser1.sellerProfile!.id,
        thumbnail: 'https://picsum.photos/seed/course-figma/800/450',
        learnings: ['Master Figma tools', 'Design mobile apps', 'Create wireframes', 'Build prototypes', 'Collaborate with developers'],
        requirements: ['Computer with Figma installed'],
        tags: ['figma', 'ui design', 'ux design', 'prototyping'],
        totalDuration: 20400,
        rating: 4.9,
        reviewCount: 78,
        enrollCount: 523,
        publishedAt: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000),
        sections: {
          create: [
            {
              title: 'Figma Basics',
              order: 0,
              lessons: {
                create: [
                  { title: 'Interface Overview', duration: 420, order: 0, description: 'Getting familiar with Figma.' },
                  { title: 'Essential Tools', duration: 840, order: 1, description: 'Shapes, text, and components.' },
                ],
              },
            },
          ],
        },
      },
    }),
    prisma.course.create({
      data: {
        title: 'Python Programming for Beginners',
        slug: 'python-programming-beginners',
        description: 'Start your programming journey with Python. Perfect for complete beginners.',
        price: 449,
        level: 'BEGINNER',
        status: 'PUBLISHED',
        categoryId: categories[1].id,
        sellerId: sellerUser2.sellerProfile!.id,
        thumbnail: 'https://picsum.photos/seed/course-python/800/450',
        learnings: ['Python fundamentals', 'Variables and data types', 'Functions and loops', 'Object-oriented programming', 'Build real projects'],
        requirements: ['No programming experience needed'],
        tags: ['python', 'programming', 'coding', 'beginners'],
        totalDuration: 28800,
        rating: 4.75,
        reviewCount: 134,
        enrollCount: 856,
        publishedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        sections: {
          create: [
            {
              title: 'Python Basics',
              order: 0,
              lessons: {
                create: [
                  { title: 'Installing Python', duration: 480, order: 0, description: 'Setup your environment.' },
                  { title: 'Your First Program', duration: 540, order: 1, description: 'Hello World and beyond.' },
                  { title: 'Variables and Data Types', duration: 720, order: 2, description: 'Working with data.' },
                ],
              },
            },
          ],
        },
      },
    }),
    prisma.course.create({
      data: {
        title: 'Advanced Social Media Marketing 2026',
        slug: 'advanced-social-media-marketing-2026',
        description: 'Master Instagram, TikTok, and Facebook marketing with the latest strategies that work in 2026.',
        price: 799,
        level: 'ADVANCED',
        status: 'PUBLISHED',
        categoryId: categories[2].id,
        sellerId: sellerUser1.sellerProfile!.id,
        thumbnail: 'https://picsum.photos/seed/course-socmed/800/450',
        learnings: ['Viral content strategies', 'Algorithm mastery', 'Influencer partnerships', 'Paid advertising', 'Analytics & optimization'],
        requirements: ['Basic social media knowledge', 'Active social accounts'],
        tags: ['social media', 'instagram', 'tiktok', 'marketing', 'advanced'],
        totalDuration: 19200,
        rating: 4.8,
        reviewCount: 56,
        enrollCount: 392,
        publishedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        sections: {
          create: [
            {
              title: 'Platform Algorithms',
              order: 0,
              lessons: {
                create: [
                  { title: 'How Instagram Algorithm Works', duration: 960, order: 0, description: 'Master the feed algorithm.' },
                  { title: 'TikTok For You Page Secrets', duration: 840, order: 1, description: 'Going viral on TikTok.' },
                ],
              },
            },
          ],
        },
      },
    }),
    prisma.course.create({
      data: {
        title: 'Copywriting Masterclass: Write Words That Sell',
        slug: 'copywriting-masterclass-write-words-sell',
        description: 'Learn persuasive copywriting techniques used by top marketers. Write copy that converts.',
        price: 649,
        level: 'INTERMEDIATE',
        status: 'PUBLISHED',
        categoryId: categories[3].id,
        sellerId: sellerUser2.sellerProfile!.id,
        thumbnail: 'https://picsum.photos/seed/course-copy/800/450',
        learnings: ['Persuasion principles', 'Sales page structure', 'Email copywriting', 'Ad copy formulas', 'Storytelling techniques'],
        requirements: ['Basic writing skills'],
        tags: ['copywriting', 'marketing', 'sales', 'writing'],
        totalDuration: 16800,
        rating: 4.95,
        reviewCount: 89,
        enrollCount: 648,
        publishedAt: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000),
        sections: {
          create: [
            {
              title: 'Copywriting Fundamentals',
              order: 0,
              lessons: {
                create: [
                  { title: 'The Psychology of Persuasion', duration: 900, order: 0, description: 'Why people buy.' },
                  { title: 'Headline Formulas', duration: 720, order: 1, description: 'Writing attention-grabbing headlines.' },
                ],
              },
            },
          ],
        },
      },
    }),
    prisma.course.create({
      data: {
        title: 'Video Editing Mastery with DaVinci Resolve',
        slug: 'video-editing-mastery-davinci-resolve',
        description: 'Professional video editing course using free DaVinci Resolve software. From beginner to pro.',
        price: 579,
        level: 'BEGINNER',
        status: 'PUBLISHED',
        categoryId: categories[4].id,
        sellerId: sellerUser2.sellerProfile!.id,
        thumbnail: 'https://picsum.photos/seed/course-video/800/450',
        learnings: ['Master DaVinci Resolve', 'Professional editing techniques', 'Color grading', 'Audio mixing', 'Export optimized videos'],
        requirements: ['Computer with DaVinci Resolve'],
        tags: ['video editing', 'davinci resolve', 'filmmaking', 'youtube'],
        totalDuration: 22800,
        rating: 4.7,
        reviewCount: 67,
        enrollCount: 479,
        publishedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
        sections: {
          create: [
            {
              title: 'Getting Started',
              order: 0,
              lessons: {
                create: [
                  { title: 'Installing DaVinci Resolve', duration: 360, order: 0, description: 'Setup and installation.' },
                  { title: 'Interface Overview', duration: 600, order: 1, description: 'Understanding the workspace.' },
                ],
              },
            },
          ],
        },
      },
    }),
    prisma.course.create({
      data: {
        title: 'Business Strategy & Planning for Entrepreneurs',
        slug: 'business-strategy-planning-entrepreneurs',
        description: 'Create winning business strategies and plans. Perfect for startup founders and business owners.',
        price: 899,
        level: 'INTERMEDIATE',
        status: 'PUBLISHED',
        categoryId: categories[6].id,
        sellerId: sellerUser1.sellerProfile!.id,
        thumbnail: 'https://picsum.photos/seed/course-bizstrat/800/450',
        learnings: ['Strategic planning frameworks', 'Market analysis', 'Financial modeling', 'Competitive positioning', 'Execution roadmaps'],
        requirements: ['Business idea or existing business'],
        tags: ['business strategy', 'entrepreneurship', 'startup', 'planning'],
        totalDuration: 25200,
        rating: 4.85,
        reviewCount: 42,
        enrollCount: 315,
        publishedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
        sections: {
          create: [
            {
              title: 'Strategy Fundamentals',
              order: 0,
              lessons: {
                create: [
                  { title: 'What is Business Strategy?', duration: 720, order: 0, description: 'Strategic thinking essentials.' },
                  { title: 'Vision and Mission', duration: 600, order: 1, description: 'Defining your business direction.' },
                ],
              },
            },
          ],
        },
      },
    }),
  ]);

  // Create course enrollments for the buyer
  await prisma.courseEnrollment.createMany({
    data: [
      { userId: buyerUser.id, courseId: course1.id, amountPaid: 499, paidAt: new Date(), progressPercent: 35 },
      { userId: buyerUser.id, courseId: course2.id, amountPaid: 799, paidAt: new Date(), progressPercent: 10 },
      { userId: buyerUser.id, courseId: additionalCourses[3].id, amountPaid: 449, paidAt: new Date(), progressPercent: 80 },
    ],
  });

  // Mark seller fee as paid + BioLink + Subscription for seller1
  const now = new Date();
  const periodEnd1 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  await prisma.sellerProfile.update({
    where: { id: sellerUser1.sellerProfile!.id },
    data: {
      sellerFeePaid: true,
      sellerFeePaidAt: now,
      sellerFeeTransactionId: 'SEED-FEE-001',
      bioEnabled: true,
      bioHeadline: 'Creative designer helping brands stand out ✨',
      bioThemeColor: '#F59E0B',
      bioBackgroundColor: '#1a1a2e',
      bioTextColor: '#ffffff',
      bioButtonStyle: 'rounded',
      bioFont: 'Poppins',
      bioCtaText: 'Let\'s Work Together',
      bioSocialLinks: [
        { platform: 'instagram', url: 'https://instagram.com/johndesigner' },
        { platform: 'twitter', url: 'https://twitter.com/johndesigner' },
        { platform: 'linkedin', url: 'https://linkedin.com/in/johnsmith' },
        { platform: 'website', url: 'https://johnsmithdesign.co.za' },
      ],
    },
  });

  await prisma.sellerSubscription.create({
    data: {
      sellerProfileId: sellerUser1.sellerProfile!.id,
      status: 'ACTIVE',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd1,
      nextBillingDate: periodEnd1,
      payments: {
        create: {
          amount: 399,
          gateway: 'PAYFAST',
          gatewayPaymentId: 'SEED-SUB-PAY-001',
          periodStart: now,
          periodEnd: periodEnd1,
          paidAt: now,
        },
      },
    },
  });

  // Mark seller fee as paid + BioLink + Subscription for seller2
  const periodEnd2 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  await prisma.sellerProfile.update({
    where: { id: sellerUser2.sellerProfile!.id },
    data: {
      sellerFeePaid: true,
      sellerFeePaidAt: now,
      sellerFeeTransactionId: 'SEED-FEE-002',
      bioEnabled: true,
      bioHeadline: 'Full-stack dev building your next big thing 🚀',
      bioThemeColor: '#3B82F6',
      bioBackgroundColor: '#0f172a',
      bioTextColor: '#f1f5f9',
      bioButtonStyle: 'pill',
      bioFont: 'Inter',
      bioCtaText: 'Start Your Project',
      bioSocialLinks: [
        { platform: 'twitter', url: 'https://twitter.com/sarahdev' },
        { platform: 'linkedin', url: 'https://linkedin.com/in/sarahjohnson' },
        { platform: 'youtube', url: 'https://youtube.com/@sarahdev' },
        { platform: 'website', url: 'https://sarahtech.dev' },
      ],
    },
  });

  await prisma.sellerSubscription.create({
    data: {
      sellerProfileId: sellerUser2.sellerProfile!.id,
      status: 'ACTIVE',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd2,
      nextBillingDate: periodEnd2,
      payments: {
        create: {
          amount: 399,
          gateway: 'PAYFAST',
          gatewayPaymentId: 'SEED-SUB-PAY-002',
          periodStart: now,
          periodEnd: periodEnd2,
          paidAt: now,
        },
      },
    },
  });

  console.log('✅ Created seller subscriptions and BioLink data');
  console.log(`✅ Created ${2 + additionalCourses.length} courses with realistic enrollment data`);

  console.log('\n🎉 Seed completed successfully!\n');
  console.log('Test accounts:');
  console.log('  Admin:  admin@zomieks.co.za / Password123');
  console.log('  Seller: john@example.com / Password123');
  console.log('  Seller: sarah@example.com / Password123');
  console.log('  Buyer:  buyer@example.com / Password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
