/**
 * Repository adapter contract.
 *
 * Every adapter (seed for the demo, Firestore for production) implements the
 * same domain-level surface. Components never see either — they go through
 * `src/lib/repositories/index.js`.
 *
 * Shapes below are documentation, not runtime validation.
 *
 * @typedef {Localized} Localized
 * @typedef {{ en: string, ar?: string }} Localized
 *
 * @typedef {Object} Vehicle
 * @property {string} id                Stable document ID
 * @property {string} slug              URL segment (shared across locales)
 * @property {'active'|'archived'|'draft'} status
 * @property {string} categoryId
 * @property {string} make
 * @property {string} model
 * @property {number} year
 * @property {Localized} name
 * @property {Localized} trim
 * @property {Localized} description
 * @property {Localized} bodyType
 * @property {VehicleSpecs} specs
 * @property {VehiclePricing} pricing   Language-neutral business data
 * @property {number} deposit
 * @property {MileagePolicy} mileage
 * @property {InsurancePolicy} insurance
 * @property {string[]} inclusionIds
 * @property {'available'|'limited'|'unavailable'} availability
 * @property {string[]} locationIds
 * @property {MediaAsset[]} media
 * @property {number} sortOrder
 * @property {string} createdAt
 * @property {string} updatedAt
 *
 * @typedef {Object} RepositoryAdapter
 * @property {(filters?: VehicleFilters) => Promise<Vehicle[]>} queryVehicles
 * @property {(filters?: VehicleFilters) => Promise<Vehicle[]>} queryAllVehicles
 * @property {(id: string) => Promise<Vehicle|null>} getVehicleById
 * @property {(slug: string) => Promise<Vehicle|null>} getVehicleBySlug
 * @property {(id: string, patch: object) => Promise<Vehicle>} updateVehicle
 * @property {(input: object) => Promise<Vehicle>} createVehicle
 * @property {(id: string, status: 'active'|'draft'|'archived') => Promise<Vehicle>} setVehicleStatus
 * @property {(id: string) => Promise<Vehicle>} archiveVehicle
 *
 * @property {() => Promise<Category[]>} queryCategories
 * @property {(id: string) => Promise<Category|null>} getCategoryById
 *
 * @property {(filters?: object) => Promise<Location[]>} queryLocations
 * @property {(id: string) => Promise<Location|null>} getLocationById
 *
 * @property {(payload: BookingRequestInput) => Promise<BookingRequest>} createBookingRequest
 * @property {(id: string) => Promise<BookingRequest|null>} getBookingById
 * @property {(filters?: object) => Promise<BookingRequest[]>} queryBookingRequests
 * @property {(payload: InquiryInput) => Promise<Inquiry>} createInquiry
 *
 * @property {(vehicleId: string, range: {pickupDate: string, returnDate: string}) => Promise<BlockPeriod[]>} queryBlockPeriods
 *
 * @property {() => Promise<HomeSection[]>} getHomeSections
 * @property {() => Promise<Navigation>} getNavigation
 * @property {() => Promise<Service[]>} getServices
 * @property {() => Promise<Offer[]>} getOffers
 * @property {() => Promise<Faq[]>} getFaqs
 * @property {() => Promise<RentalTerms>} getRentalTerms
 * @property {() => Promise<SiteSettings>} getSiteSettings
 * @property {(path: string) => Promise<SeoEntry|null>} getSeo
 */

export {};
