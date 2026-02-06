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

  console.log('✅ Created 3 sample services');

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

  // Create a course enrollment for the buyer
  await prisma.courseEnrollment.create({
    data: {
      userId: buyerUser.id,
      courseId: course1.id,
      amountPaid: 499,
    },
  });

  // Mark seller fee as paid for seller1 (so they can create courses)
  await prisma.sellerProfile.update({
    where: { id: sellerUser1.sellerProfile!.id },
    data: {
      sellerFeePaid: true,
      sellerFeePaidAt: new Date(),
      sellerFeeTransactionId: 'SEED-FEE-001',
    },
  });

  await prisma.sellerProfile.update({
    where: { id: sellerUser2.sellerProfile!.id },
    data: {
      sellerFeePaid: true,
      sellerFeePaidAt: new Date(),
      sellerFeeTransactionId: 'SEED-FEE-002',
    },
  });

  console.log('✅ Created 2 sample courses with sections & lessons');

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
