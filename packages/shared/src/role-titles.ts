/** Office / white-collar roles Dealo commonly staffs. */
export const OFFICE_ROLE_TITLES = [
  'Executive Assistant',
  'Administrative Assistant',
  'Office Manager',
  'Receptionist',
  'Customer Success Associate',
  'Sales Coordinator',
  'Account Manager',
  'Operations Coordinator',
  'Operations Manager',
  'Project Coordinator',
  'HR Coordinator',
  'Talent Acquisition Specialist',
  'Finance Officer',
  'Accountant',
  'Bookkeeper',
  'Procurement Officer',
  'Supply Chain Coordinator',
  'Marketing Coordinator',
  'Content Writer',
  'Social Media Manager',
  'Data Entry Specialist',
  'Business Analyst',
  'Product Manager',
  'Software Engineer',
  'Frontend Developer',
  'Backend Developer',
  'IT Support Specialist',
  'Legal Assistant',
  'Compliance Officer',
] as const;

/** Skilled trades / blue-collar roles Dealo commonly staffs. */
export const TRADE_ROLE_TITLES = [
  'Bricklayer',
  'Mason',
  'Carpenter',
  'Electrician',
  'Plumber',
  'Welder',
  'Steel Fixer',
  'Painter',
  'Tiler',
  'HVAC Technician',
  'Site Supervisor',
  'Construction Foreman',
  'Quantity Surveyor Assistant',
  'Heavy Equipment Operator',
  'Scaffolding Technician',
  'Pipe Fitter',
  'Mechanic',
  'Generator Technician',
  'Solar Installation Technician',
  'Glazier',
  'Roofer',
  'Interior Finisher',
  'Landscaper',
  'Warehouse Associate',
  'Logistics Associate',
  'Forklift Operator',
] as const;

export const ALL_ROLE_TITLES = [...OFFICE_ROLE_TITLES, ...TRADE_ROLE_TITLES] as const;

export function suggestRoleTitles(
  query: string,
  family?: 'OFFICE_PROFESSIONAL' | 'SKILLED_TRADE' | string,
  limit = 8,
) {
  const q = query.trim().toLowerCase();
  const pool =
    family === 'SKILLED_TRADE'
      ? TRADE_ROLE_TITLES
      : family === 'OFFICE_PROFESSIONAL'
        ? OFFICE_ROLE_TITLES
        : ALL_ROLE_TITLES;

  if (!q) return [...pool].slice(0, limit);

  return pool
    .filter((title) => title.toLowerCase().includes(q))
    .slice(0, limit);
}
