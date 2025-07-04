# Breadcrumb Navigation Updates

## Overview
Updated the breadcrumb navigation system to provide better user experience with term-first navigation and comprehensive path visibility for class assignments.

## Key Changes

### 1. Term Name First in Breadcrumbs
- **Before**: Page Title > Term Name
- **After**: **Term Name** > Page Title
- The term name is now clickable and opens the term selector
- Users can easily switch terms from any page

### 2. Enhanced Class Assignment Breadcrumbs
- **Full Path Navigation**: `Summer 2025 > My Classes > College Algebra > [Current Tab]`
- **Dynamic Tab Updates**: Breadcrumbs change based on active tab:
  - "All Assignments" 
  - "By Category"
  - "Grade Predictor"
- **Interactive Elements**: 
  - Term name opens term selector
  - "My Classes" navigates back to classes list

### 3. Component Architecture

#### TermLayout Component Updates
- Added support for custom breadcrumbs via `breadcrumbs` prop
- `BreadcrumbItem` interface supports:
  - `label`: Display text
  - `href`: Optional link destination  
  - `onClick`: Optional click handler
- Fallback to simple breadcrumbs for pages without custom breadcrumbs

#### ClassAssignmentsView Component Updates  
- Added `onTabChange` prop to notify parent of tab changes
- Tracks `activeTab` state internally
- Parent components can build dynamic breadcrumbs based on current tab

#### Class Assignment Page Updates
- Implements custom breadcrumb construction
- Maps tab values to user-friendly labels
- Handles tab change events to update breadcrumbs

## Usage Examples

### Simple Page Breadcrumbs
```tsx
<TermLayout
  currentTerm={term}
  activeView="todo"
  pageTitle="To-Do List"
>
```
**Result**: `Summer 2025 > To-Do List`

### Complex Page Breadcrumbs  
```tsx
const breadcrumbs = [
  {
    label: "My Classes",
    onClick: handleBackToClasses
  },
  {
    label: classData?.name || "Class"
  },
  {
    label: TAB_LABELS[currentTab] || currentTab
  }
];

<TermLayout
  currentTerm={term}
  activeView="class-detail"
  pageTitle={`${classData.name} - Assignments`}
  breadcrumbs={breadcrumbs}
>
```
**Result**: `Summer 2025 > My Classes > College Algebra > All Assignments`

## Benefits

1. **Consistent Navigation**: Term name always appears first for easy term switching
2. **Context Awareness**: Users always know their full navigation path
3. **Quick Access**: One-click term switching from any page
4. **Dynamic Updates**: Breadcrumbs reflect real-time page state changes
5. **Intuitive UX**: Clear visual hierarchy and interactive elements

## Files Modified

- `/components/term-layout.tsx` - Enhanced breadcrumb system
- `/components/class-assignments-view.tsx` - Added tab change notifications  
- `/app/term/[termSlug]/class/[classSlug]/page.tsx` - Custom breadcrumb implementation

## Type Safety

All breadcrumb components maintain full TypeScript type safety with proper interfaces for:
- `BreadcrumbItem` structure
- `TermLayoutProps` with optional breadcrumbs
- Tab change handler signatures
