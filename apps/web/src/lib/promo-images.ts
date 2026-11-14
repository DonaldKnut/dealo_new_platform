export type PromoImage = {
  src: string;
  alt: string;
};

export const PROMO_FLYER_IMAGES: readonly PromoImage[] = [
  {
    src: 'https://res.cloudinary.com/ls40ecmc/image/upload/v1793613138/Man_and_woman_during_interview_06b7e938_2K.jpg',
    alt: 'Man and woman during a professional interview',
  },
  {
    src: 'https://res.cloudinary.com/ls40ecmc/image/upload/v1793613138/Executive_conducting_job_interview_c356c09c_2K.jpg',
    alt: 'Executive conducting a job interview',
  },
  {
    src: 'https://res.cloudinary.com/ls40ecmc/image/upload/v1793613137/Woman_working_on_laptop_in_bd475d4a_2K.jpg',
    alt: 'Professional woman working on a laptop in an office',
  },
  {
    src: 'https://res.cloudinary.com/ls40ecmc/image/upload/v1793613137/Woman_reviewing_documents_on_laptop_59854bb3_2K.jpg',
    alt: 'Professional woman reviewing documents on a laptop',
  },
];

/** Contact modal promo panel only — office + trades team photos. */
export const CONTACT_PROMO_IMAGES: readonly PromoImage[] = [
  {
    src: 'https://res.cloudinary.com/dyaetoldv/image/upload/v1794675588/Professionals_standing_together___ea17387a_2K_mhujvl.jpg',
    alt: 'Office professionals standing together in a modern workplace',
  },
  {
    src: 'https://res.cloudinary.com/dyaetoldv/image/upload/v1794675588/Workers_standing_together_in_attire_afab3476_2K_y5sfrc.jpg',
    alt: 'Construction and skilled trades workers standing together on site',
  },
  {
    src: 'https://res.cloudinary.com/dyaetoldv/image/upload/v1794675588/Trade_and_office_workers_standing_2447b7b9_2K_a5nud0.jpg',
    alt: 'Trade worker and office professional standing together near a worksite',
  },
];
