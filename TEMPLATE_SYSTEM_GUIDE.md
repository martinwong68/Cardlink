# Card Template System - Implementation Guide

## Overview

The Cardlink platform now supports **10 different card templates** that users can choose from, with 3 templates available for free users and all 10 for premium users.

## Features Implemented

### 1. Template System
- **10 Professional Templates** designed for different industries
- **3 Free Templates**: Classic Business, Minimalist, Modern Tech
- **7 Premium Templates**: Creative Agency, Medical Professional, Real Estate, Fashion & Beauty, Financial Services, Restaurant & Food, Artist & Portfolio

### 2. Template Selection
- Users can choose templates from the card edit page
- Free users see locked premium templates with upgrade prompts
- Premium users have access to all templates
- Template selector shows preview and category for each template

### 3. Loading Page for NFC Tap
- Beautiful animated loading screen shown when users tap their NFC card
- Smooth transition to the actual business card
- Error handling with user-friendly messages

### 4. Avatar Functionality
- Avatar upload and storage in Supabase storage
- Avatar preview in card editor
- Avatar display on public cards
- Support for fallback initials when no avatar is set

## Template List

### Free Templates

1. **Classic Business** (`classic-business`)
   - Category: Business
   - Style: Traditional corporate
   - Default Color: Blue (#1e40af)
   - Perfect for: Professionals, executives, consultants

2. **Minimalist** (`minimalist`)
   - Category: General
   - Style: Clean and simple
   - Default Color: Slate (#64748b)
   - Perfect for: Anyone preferring minimal design

3. **Modern Tech** (`modern-tech`)
   - Category: Technology
   - Style: Contemporary with grid pattern
   - Default Color: Indigo (#6366f1)
   - Perfect for: Tech professionals, developers, startups

### Premium Templates

4. **Creative Agency** (`creative-agency`)
   - Category: Creative
   - Style: Bold and vibrant
   - Default Color: Purple (#a855f7)
   - Perfect for: Creative professionals, designers, agencies

5. **Medical Professional** (`medical-professional`)
   - Category: Healthcare
   - Style: Clean and trustworthy  
   - Default Color: Sky Blue (#0ea5e9)
   - Perfect for: Doctors, nurses, healthcare providers

6. **Real Estate** (`real-estate`)
   - Category: Real Estate
   - Style: Professional with topography pattern
   - Default Color: Orange (#f97316)
   - Perfect for: Real estate agents, property managers

7. **Fashion & Beauty** (`fashion-beauty`)
   - Category: Fashion
   - Style: Stylish and elegant
   - Default Color: Pink (#ec4899)
   - Perfect for: Fashion industry, beauty professionals

8. **Financial Services** (`financial-services`)
   - Category: Finance
   - Style: Professional and corporate
   - Default Color: Dark Gray (#111827)
   - Perfect for: Financial advisors, bankers, accountants

9. **Restaurant & Food** (`restaurant-food`)
   - Category: Food & Beverage
   - Style: Warm and inviting
   - Default Color: Amber (#f59e0b)
   - Perfect for: Restaurant owners, chefs, food businesses

10. **Artist & Portfolio** (`artist-portfolio`)
    - Category: Arts
    - Style: Creative with circles pattern
    - Default Color: Teal (#14b8a6)
    - Perfect for: Artists, photographers, designers

## Database Schema

### Migration Required

Run the migration file to add the template column to the database:

```sql
-- File: /migrations/add_template_column.sql
```

### Business Cards Table Update

```sql
ALTER TABLE business_cards ADD COLUMN template TEXT DEFAULT NULL;
CREATE INDEX idx_business_cards_template ON business_cards(template);
```

## File Structure

```
cardlink/
├── components/
│   ├── TemplateSelector.tsx          # Template selection UI
│   ├── TapHandler.tsx                # NFC tap loading handler
│   └── templates/
│       ├── TemplateRenderer.tsx      # Main template router
│       ├── ClassicBusinessTemplate.tsx
│       ├── MinimalistTemplate.tsx
│       ├── ModernTechTemplate.tsx
│       ├── CreativeAgencyTemplate.tsx
│       ├── MedicalProfessionalTemplate.tsx
│       ├── RealEstateTemplate.tsx
│       ├── FashionBeautyTemplate.tsx
│       ├── FinancialServicesTemplate.tsx
│       ├── RestaurantFoodTemplate.tsx
│       └── ArtistPortfolioTemplate.tsx
├── src/lib/
│   └── templates.ts                  # Template definitions
├── app/
│   ├── tap/
│   │   ├── [uid]/
│   │   │   ├── page.tsx             # Loading page
│   │   │   └── route.ts             # Backward compatibility
│   │   └── loading/
│   │       └── page.tsx             # Loading component
│   └── api/nfc/tap/[uid]/
│       └── route.ts                 # API endpoint for NFC tap
└── migrations/
    └── add_template_column.sql      # Database migration
```

## Usage

### For Users

1. **Selecting a Template**:
   - Go to card edit page
   - Scroll to "Choose Template" section
   - Click on desired template
   - Premium templates show a lock icon for free users
   - Save the card to apply the template

2. **Uploading Avatar**:
   - Go to card edit page
   - Find "Profile Photo" section
   - Click "Upload Photo"
   - Select image file
   - Avatar will appear immediately in preview

3. **NFC Tap Experience**:
   - Tap NFC card against phone
   - See beautiful loading animation
   - Automatically redirect to business card

### For Developers

1. **Adding a New Template**:
   ```typescript
   // 1. Add template definition to src/lib/templates.ts
   {
     id: "new-template",
     name: "New Template",
     description: "Description here",
     category: "Category",
     isPremium: false,
     defaultPattern: "gradient-1",
     defaultColor: "#6366f1",
   }

   // 2. Create template component in components/templates/
   // 3. Import and add to TemplateRenderer.tsx
   ```

2. **Customizing Template Styles**:
   - Each template component receives all card data as props
   - Modify layout, colors, and styling as needed
   - Reuse shared components from ClassicBusinessTemplate

## API Endpoints

### POST /api/nfc/tap/[uid]
Handles NFC tap and returns action for redirection

**Response**:
```json
{
  "action": "redirect" | "register" | "suspended" | "deactivated" | "expired" | "no_card" | "error",
  "slug": "card-slug" // if action is "redirect"
}
```

## Premium Features

Free users get:
- 3 basic templates
- 1 business card
- Basic features

Premium users get:
- All 10 templates
- Unlimited business cards
- Priority support
- Advanced analytics

## Technical Notes

1. **Template Rendering**:
   - Templates are rendered client-side
   - Each template is a React component
   - Templates receive standardized props via TemplateRendererProps

2. **Avatar Storage**:
   - Avatars stored in Supabase Storage `avatars` bucket
   - Public URLs generated automatically
   - Cached with CDN for fast loading

3. **NFC Tap Flow**:
   - GET /tap/[uid] → Shows loading page
   - Client calls POST /api/nfc/tap/[uid]
   - API processes tap and returns action
   - Client redirects based on action

## Future Enhancements

- [ ] Allow users to customize templates further
- [ ] Add template preview before selection
- [ ] Support custom template creation for premium users
- [ ] Add more template categories
- [ ] Template marketplace

## Support

For issues or questions:
- Check the documentation
- Review template source code
- Contact support team
