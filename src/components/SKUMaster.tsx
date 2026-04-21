import { ArrowLeft, Plus, Trash2, Edit, Eye, Search, ArrowUpRight } from 'lucide-react';
import { MasterListToolbar } from './ui/MasterListToolbar';
import { useNavigate } from 'react-router-dom';
import { MasterPageShell } from './ui/MasterPageShell';
import { useState, useMemo, useCallback } from 'react';
import { ApprovalModal } from './ApprovalModal';
import { useIncrementalMasterRecords } from '../hooks/useIncrementalMasterRecords';
import { applyMasterApprovalAction } from '../lib/masters/masterScreenApproval';
import { useMasterData } from '../contexts/MasterDataContext';
import { PremiumActionButton, PremiumFilterMenu, toggleMultiSelect } from './ui/premium-register';
import { FormShell, FormSection, PxFormField, type SaveStatus } from './ui/form-primitives';
import { useFormKeyboardSave } from '../hooks/useFormKeyboardSave';
import { EntityMappingSelector } from './shared/EntityMappingSelector';
import type { EntityScopeMapping } from '../lib/masters/entityMapping';

interface SKU {
  id: string;

  // --- SKU Identification ---
  internalSku: string;
  articleCode: string;
  globalIdentifier?: string;
  globalIdentifierNumber?: string;
  brandSku?: string;
  brand?: string;

  // --- Product Classification ---
  category?: string;
  subCategory?: string;
  productNameEn?: string;
  productNameLocal?: string;
  descriptionEn?: string;
  descriptionLocal?: string;
  gender?: string;
  ageGroup?: string;
  material?: string;
  careInstructions?: string;
  fitType?: string;
  color?: string;
  size?: string;
  sizeSystem?: string;
  season?: string;
  collection?: string;
  warranty?: string;

  // --- Physical Attributes ---
  shelfLife?: string;
  casePackQty?: number;
  productLength?: number;
  productWidth?: number;
  productHeight?: number;
  packageLength?: number;
  packageWidth?: number;
  packageHeight?: number;
  grossWeight?: number;
  volumetricWeight?: number;
  shippingWeight?: number;
  storageCondition?: string;

  // --- Catalog & Content ---
  catalogLink?: string;
  videoUrls?: string;
  productImages?: string;

  // --- Compliance ---
  sampleLabelWarning?: string;
  certification?: string;
  hsnCode?: string;
  taxRate?: number;
  taxType?: string;
  defaultMrp?: number;

  // --- Existing — DO NOT REMOVE ---
  status: 'Active' | 'Inactive';
  approvalStatus: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected';
  entityMappings?: EntityScopeMapping[];
  originalData?: SKU;
}

interface Change {
  field: string;
  oldValue: string;
  newValue: string;
}

// --- Hardcoded enum dropdown options ---
const GLOBAL_IDENTIFIER_OPTIONS = ['EAN', 'UPC', 'GTIN-8', 'GTIN-13', 'GTIN-14', 'ISBN'];
const GENDER_OPTIONS = ['Men', 'Women', 'Unisex', 'Boys', 'Girls', 'Kids'];
const AGE_GROUP_OPTIONS = ['Newborn', 'Infant', 'Toddler', 'Kids', 'Adult'];
const CARE_INSTRUCTION_OPTIONS = [
  'Machine Wash Cold',
  'Hand Wash Only',
  'Dry Clean Only',
  'Do Not Bleach',
  'Tumble Dry Low',
  'Iron Low Heat',
];
const FIT_TYPE_OPTIONS = ['Regular', 'Slim', 'Relaxed', 'Skinny', 'Oversized', 'Tailored'];
const SIZE_SYSTEM_OPTIONS = ['IN', 'US', 'UK', 'EU'];
const STORAGE_CONDITION_OPTIONS = [
  'Ambient',
  'Refrigerated',
  'Frozen',
  'Dry',
  'Temperature Controlled',
];
const SAMPLE_LABEL_WARNING_OPTIONS = [
  'None',
  'Choking Hazard',
  'Not for Children Under 3',
  'Flammable',
  'Keep Away from Fire',
  'Handle With Care',
];
const CERTIFICATION_OPTIONS = ['BIS', 'FSSAI', 'ISI', 'AGMARK', 'None'];
const TAX_TYPE_OPTIONS = ['GST', 'VAT', 'Sales Tax', 'None'];

const seedSKUs: SKU[] = [
  {
    id: '1',
    internalSku: 'SKU-TSHIRT-BLK-M',
    articleCode: 'ART-10001',
    globalIdentifier: 'EAN',
    globalIdentifierNumber: '8901234567890',
    brandSku: 'SBK-TSHIRT-001',
    brand: 'Subko',
    category: 'Apparel',
    subCategory: 'T-Shirts',
    productNameEn: 'Subko Classic Crew Tee',
    productNameLocal: 'सबको क्लासिक टी',
    descriptionEn: '100% cotton crew-neck t-shirt with subtle Subko logo.',
    descriptionLocal: 'सौ प्रतिशत कॉटन क्रू-नेक टी-शर्ट',
    gender: 'Unisex',
    ageGroup: 'Adult',
    material: 'Cotton',
    careInstructions: 'Machine Wash Cold',
    fitType: 'Regular',
    color: 'Black',
    size: 'M',
    sizeSystem: 'IN',
    season: 'SS25',
    collection: 'Essentials',
    warranty: '30 days',
    shelfLife: '12/2028',
    casePackQty: 24,
    productLength: 70,
    productWidth: 50,
    productHeight: 1,
    packageLength: 30,
    packageWidth: 25,
    packageHeight: 3,
    grossWeight: 0.25,
    volumetricWeight: 0.45,
    shippingWeight: 0.3,
    storageCondition: 'Ambient',
    catalogLink: 'https://subko.coffee/catalog/tshirt-classic',
    videoUrls: 'https://youtu.be/abc123',
    productImages: 'https://cdn.subko.coffee/sku/tshirt-blk-m-1.jpg,https://cdn.subko.coffee/sku/tshirt-blk-m-2.jpg',
    sampleLabelWarning: 'None',
    certification: 'None',
    hsnCode: '6109',
    taxRate: 12,
    taxType: 'GST',
    defaultMrp: 799,
    status: 'Active',
    approvalStatus: 'Approved',
  },
  {
    id: '2',
    internalSku: 'SKU-COFFEE-250G',
    articleCode: 'ART-20011',
    globalIdentifier: 'GTIN-13',
    globalIdentifierNumber: '8901111222333',
    brandSku: 'SBK-COF-ARB-250',
    brand: 'Subko',
    category: 'Food & Beverage',
    subCategory: 'Coffee Beans',
    productNameEn: 'Arabica Single Origin 250g',
    productNameLocal: 'अरेबिका सिंगल ओरिजिन 250 ग्राम',
    descriptionEn: 'Whole roasted Arabica beans from Chikmagalur estates.',
    descriptionLocal: 'चिकमगलूर एस्टेट की साबुत भुनी हुई अरेबिका बीन्स',
    gender: '',
    ageGroup: 'Adult',
    material: 'Coffee Beans',
    careInstructions: '',
    fitType: '',
    color: '',
    size: '250g',
    sizeSystem: '',
    season: '',
    collection: 'Single Origin',
    warranty: '',
    shelfLife: '06/2026',
    casePackQty: 12,
    productLength: 18,
    productWidth: 10,
    productHeight: 5,
    packageLength: 20,
    packageWidth: 12,
    packageHeight: 7,
    grossWeight: 0.28,
    volumetricWeight: 0.35,
    shippingWeight: 0.32,
    storageCondition: 'Dry',
    catalogLink: 'https://subko.coffee/catalog/arabica-250',
    videoUrls: '',
    productImages: 'https://cdn.subko.coffee/sku/arabica-250-1.jpg',
    sampleLabelWarning: 'None',
    certification: 'FSSAI',
    hsnCode: '0901',
    taxRate: 5,
    taxType: 'GST',
    defaultMrp: 650,
    status: 'Active',
    approvalStatus: 'Approved',
  },
  {
    id: '3',
    internalSku: 'SKU-MUG-CER-350',
    articleCode: 'ART-30045',
    globalIdentifier: 'EAN',
    globalIdentifierNumber: '8902222333444',
    brandSku: 'SBK-MUG-001',
    brand: 'Subko',
    category: 'Merchandise',
    subCategory: 'Drinkware',
    productNameEn: 'Subko Ceramic Mug 350ml',
    productNameLocal: 'सबको सिरेमिक मग 350 मिली',
    descriptionEn: 'Hand-glazed ceramic mug, 350ml capacity, microwave safe.',
    descriptionLocal: 'हाथ से पेंट किया हुआ सिरेमिक मग',
    gender: 'Unisex',
    ageGroup: 'Adult',
    material: 'Ceramic',
    careInstructions: 'Hand Wash Only',
    fitType: '',
    color: 'White',
    size: '350ml',
    sizeSystem: '',
    season: '',
    collection: 'Cafe Essentials',
    warranty: '6 months',
    shelfLife: '',
    casePackQty: 6,
    productLength: 12,
    productWidth: 9,
    productHeight: 10,
    packageLength: 14,
    packageWidth: 11,
    packageHeight: 12,
    grossWeight: 0.45,
    volumetricWeight: 0.55,
    shippingWeight: 0.5,
    storageCondition: 'Ambient',
    catalogLink: 'https://subko.coffee/catalog/ceramic-mug',
    videoUrls: '',
    productImages: 'https://cdn.subko.coffee/sku/mug-white-1.jpg,https://cdn.subko.coffee/sku/mug-white-2.jpg',
    sampleLabelWarning: 'Handle With Care',
    certification: 'None',
    hsnCode: '6912',
    taxRate: 12,
    taxType: 'GST',
    defaultMrp: 499,
    status: 'Active',
    approvalStatus: 'Pending Approval',
  },
];

export function SKUMaster() {
  const navigate = useNavigate();
  const { items, taxCodes } = useMasterData();
  const [skus, setSKUs, isHydrating, persistSKUs] = useIncrementalMasterRecords<SKU>('sku_master', seedSKUs);

  const [showForm, setShowForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // --- SKU Identification ---
  const [internalSku, setInternalSku] = useState('');
  const [articleCode, setArticleCode] = useState('');
  const [globalIdentifier, setGlobalIdentifier] = useState('');
  const [globalIdentifierNumber, setGlobalIdentifierNumber] = useState('');
  const [brandSku, setBrandSku] = useState('');
  const [brand, setBrand] = useState('');

  // --- Product Classification ---
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [productNameEn, setProductNameEn] = useState('');
  const [productNameLocal, setProductNameLocal] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [descriptionLocal, setDescriptionLocal] = useState('');
  const [gender, setGender] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [material, setMaterial] = useState('');
  const [careInstructions, setCareInstructions] = useState('');
  const [fitType, setFitType] = useState('');
  const [color, setColor] = useState('');
  const [size, setSize] = useState('');
  const [sizeSystem, setSizeSystem] = useState('');
  const [season, setSeason] = useState('');
  const [collection, setCollection] = useState('');
  const [warranty, setWarranty] = useState('');

  // --- Physical Attributes ---
  const [shelfLife, setShelfLife] = useState('');
  const [casePackQty, setCasePackQty] = useState<string>('');
  const [productLength, setProductLength] = useState<string>('');
  const [productWidth, setProductWidth] = useState<string>('');
  const [productHeight, setProductHeight] = useState<string>('');
  const [packageLength, setPackageLength] = useState<string>('');
  const [packageWidth, setPackageWidth] = useState<string>('');
  const [packageHeight, setPackageHeight] = useState<string>('');
  const [grossWeight, setGrossWeight] = useState<string>('');
  const [volumetricWeight, setVolumetricWeight] = useState<string>('');
  const [shippingWeight, setShippingWeight] = useState<string>('');
  const [storageCondition, setStorageCondition] = useState('');

  // --- Catalog & Content ---
  const [catalogLink, setCatalogLink] = useState('');
  const [videoUrls, setVideoUrls] = useState('');
  const [productImages, setProductImages] = useState('');

  // --- Compliance ---
  const [sampleLabelWarning, setSampleLabelWarning] = useState('');
  const [certification, setCertification] = useState('');
  const [hsnCode, setHsnCode] = useState('');
  const [taxRate, setTaxRate] = useState<string>('');
  const [taxType, setTaxType] = useState('');
  const [defaultMrp, setDefaultMrp] = useState<string>('');

  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [entityMappings, setEntityMappings] = useState<EntityScopeMapping[]>([]);

  // Approval modal state
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [currentReviewRecord, setCurrentReviewRecord] = useState<SKU | null>(null);
  const [detectedChanges, setDetectedChanges] = useState<Change[]>([]);

  // Filters / search
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [approvalFilter, setApprovalFilter] = useState<string[]>([]);

  // --- Live dropdown options derived from master data ---
  const categoryOptions = useMemo(() => {
    const fromItems = items.map((i) => i.category).filter(Boolean);
    const fromSkus = skus.map((s) => s.category || '').filter(Boolean);
    return [...new Set([...fromItems, ...fromSkus])];
  }, [items, skus]);

  const subCategoryOptions = useMemo(() => {
    const fromItems = items.map((i) => i.subCategory).filter(Boolean);
    const fromSkus = skus.map((s) => s.subCategory || '').filter(Boolean);
    return [...new Set([...fromItems, ...fromSkus])];
  }, [items, skus]);

  const hsnOptions = useMemo(() => {
    const fromItems = items.map((i) => i.hsnCode).filter(Boolean);
    const fromTax = taxCodes.map((t: any) => t.taxCode || '').filter(Boolean);
    const fromSkus = skus.map((s) => s.hsnCode || '').filter(Boolean);
    return [...new Set([...fromItems, ...fromTax, ...fromSkus])];
  }, [items, taxCodes, skus]);

  const brandOptions = useMemo(() => {
    const fromSkus = skus.map((s) => s.brand || '').filter(Boolean);
    return [...new Set(['Subko', ...fromSkus])];
  }, [skus]);

  const sortedSKUs = useMemo(() => {
    return [...skus].sort((a, b) =>
      (a.articleCode ?? a.internalSku ?? '').localeCompare(
        b.articleCode ?? b.internalSku ?? '',
        undefined,
        { sensitivity: 'base' },
      ),
    );
  }, [skus]);

  const filteredSKUs = useMemo(() => {
    return sortedSKUs.filter((sku) => {
      const haystack = [
        sku.internalSku,
        sku.articleCode,
        sku.productNameEn || '',
        sku.brand || '',
        sku.category || '',
        sku.subCategory || '',
      ]
        .join(' ')
        .toLowerCase();
      const matchesSearch = haystack.includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter.length === 0 || categoryFilter.includes(sku.category || '');
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(sku.status);
      const matchesApproval = approvalFilter.length === 0 || approvalFilter.includes(sku.approvalStatus);
      return matchesSearch && matchesCategory && matchesStatus && matchesApproval;
    });
  }, [sortedSKUs, searchTerm, categoryFilter, statusFilter, approvalFilter]);

  const hasActiveFilters =
    searchTerm.trim().length > 0 ||
    categoryFilter.length > 0 ||
    statusFilter.length > 0 ||
    approvalFilter.length > 0;

  const resetForm = () => {
    setInternalSku('');
    setArticleCode('');
    setGlobalIdentifier('');
    setGlobalIdentifierNumber('');
    setBrandSku('');
    setBrand('');
    setCategory('');
    setSubCategory('');
    setProductNameEn('');
    setProductNameLocal('');
    setDescriptionEn('');
    setDescriptionLocal('');
    setGender('');
    setAgeGroup('');
    setMaterial('');
    setCareInstructions('');
    setFitType('');
    setColor('');
    setSize('');
    setSizeSystem('');
    setSeason('');
    setCollection('');
    setWarranty('');
    setShelfLife('');
    setCasePackQty('');
    setProductLength('');
    setProductWidth('');
    setProductHeight('');
    setPackageLength('');
    setPackageWidth('');
    setPackageHeight('');
    setGrossWeight('');
    setVolumetricWeight('');
    setShippingWeight('');
    setStorageCondition('');
    setCatalogLink('');
    setVideoUrls('');
    setProductImages('');
    setSampleLabelWarning('');
    setCertification('');
    setHsnCode('');
    setTaxRate('');
    setTaxType('');
    setDefaultMrp('');
    setStatus('Active');
    setEntityMappings([]);
    setIsEditMode(false);
    setEditingId(null);
  };

  const toNum = (v: string): number | undefined => {
    if (v === '' || v === null || v === undefined) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };

  const handleSubmit = async (approvalStatus: SKU['approvalStatus'] = 'Pending Approval') => {
    if (!internalSku.trim() || !articleCode.trim()) {
      alert('Internal SKU and Article Code are required.');
      return;
    }

    if (!isEditMode && skus.some((s) => s.internalSku.trim().toLowerCase() === internalSku.trim().toLowerCase())) {
      alert(`Internal SKU ${internalSku} already exists.`);
      return;
    }

    const buildRecord = (id: string, originalData?: SKU): SKU => ({
      id,
      internalSku,
      articleCode,
      globalIdentifier: globalIdentifier || undefined,
      globalIdentifierNumber: globalIdentifierNumber || undefined,
      brandSku: brandSku || undefined,
      brand: brand || undefined,
      category: category || undefined,
      subCategory: subCategory || undefined,
      productNameEn: productNameEn || undefined,
      productNameLocal: productNameLocal || undefined,
      descriptionEn: descriptionEn || undefined,
      descriptionLocal: descriptionLocal || undefined,
      gender: gender || undefined,
      ageGroup: ageGroup || undefined,
      material: material || undefined,
      careInstructions: careInstructions || undefined,
      fitType: fitType || undefined,
      color: color || undefined,
      size: size || undefined,
      sizeSystem: sizeSystem || undefined,
      season: season || undefined,
      collection: collection || undefined,
      warranty: warranty || undefined,
      shelfLife: shelfLife || undefined,
      casePackQty: toNum(casePackQty),
      productLength: toNum(productLength),
      productWidth: toNum(productWidth),
      productHeight: toNum(productHeight),
      packageLength: toNum(packageLength),
      packageWidth: toNum(packageWidth),
      packageHeight: toNum(packageHeight),
      grossWeight: toNum(grossWeight),
      volumetricWeight: toNum(volumetricWeight),
      shippingWeight: toNum(shippingWeight),
      storageCondition: storageCondition || undefined,
      catalogLink: catalogLink || undefined,
      videoUrls: videoUrls || undefined,
      productImages: productImages || undefined,
      sampleLabelWarning: sampleLabelWarning || undefined,
      certification: certification || undefined,
      hsnCode: hsnCode || undefined,
      taxRate: toNum(taxRate),
      taxType: taxType || undefined,
      defaultMrp: toNum(defaultMrp),
      status,
      approvalStatus,
      entityMappings,
      ...(originalData ? { originalData } : {}),
    });

    let nextSKUs: SKU[];
    if (isEditMode && editingId) {
      const original = skus.find((s) => s.id === editingId);
      const updated = buildRecord(editingId, original);
      nextSKUs = skus.map((s) => (s.id === editingId ? updated : s));
    } else {
      const created = buildRecord(Date.now().toString());
      nextSKUs = [...skus, created];
    }

    setSKUs(nextSKUs);
    const persisted = await persistSKUs(nextSKUs);
    if (!persisted) {
      alert('SKU record could not be saved to the database. Please try again.');
      return;
    }

    setShowForm(false);
    resetForm();
  };

  const handleEdit = (sku: SKU) => {
    setIsEditMode(true);
    setEditingId(sku.id);
    setInternalSku(sku.internalSku || '');
    setArticleCode(sku.articleCode || '');
    setGlobalIdentifier(sku.globalIdentifier || '');
    setGlobalIdentifierNumber(sku.globalIdentifierNumber || '');
    setBrandSku(sku.brandSku || '');
    setBrand(sku.brand || '');
    setCategory(sku.category || '');
    setSubCategory(sku.subCategory || '');
    setProductNameEn(sku.productNameEn || '');
    setProductNameLocal(sku.productNameLocal || '');
    setDescriptionEn(sku.descriptionEn || '');
    setDescriptionLocal(sku.descriptionLocal || '');
    setGender(sku.gender || '');
    setAgeGroup(sku.ageGroup || '');
    setMaterial(sku.material || '');
    setCareInstructions(sku.careInstructions || '');
    setFitType(sku.fitType || '');
    setColor(sku.color || '');
    setSize(sku.size || '');
    setSizeSystem(sku.sizeSystem || '');
    setSeason(sku.season || '');
    setCollection(sku.collection || '');
    setWarranty(sku.warranty || '');
    setShelfLife(sku.shelfLife || '');
    setCasePackQty(sku.casePackQty?.toString() || '');
    setProductLength(sku.productLength?.toString() || '');
    setProductWidth(sku.productWidth?.toString() || '');
    setProductHeight(sku.productHeight?.toString() || '');
    setPackageLength(sku.packageLength?.toString() || '');
    setPackageWidth(sku.packageWidth?.toString() || '');
    setPackageHeight(sku.packageHeight?.toString() || '');
    setGrossWeight(sku.grossWeight?.toString() || '');
    setVolumetricWeight(sku.volumetricWeight?.toString() || '');
    setShippingWeight(sku.shippingWeight?.toString() || '');
    setStorageCondition(sku.storageCondition || '');
    setCatalogLink(sku.catalogLink || '');
    setVideoUrls(sku.videoUrls || '');
    setProductImages(sku.productImages || '');
    setSampleLabelWarning(sku.sampleLabelWarning || '');
    setCertification(sku.certification || '');
    setHsnCode(sku.hsnCode || '');
    setTaxRate(sku.taxRate?.toString() || '');
    setTaxType(sku.taxType || '');
    setDefaultMrp(sku.defaultMrp?.toString() || '');
    setStatus(sku.status);
    setEntityMappings(sku.entityMappings || []);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    const sku = skus.find((s) => s.id === id);
    if (sku?.approvalStatus === 'Approved') {
      alert('Cannot delete approved/live records. You can only modify them through the approval workflow.');
      return;
    }
    setSKUs(skus.filter((s) => s.id !== id));
  };

  const handleReview = (sku: SKU) => {
    const changes: Change[] = [];
    const original = sku.originalData;

    if (original) {
      const compare = (field: string, oldV: unknown, newV: unknown) => {
        const oldStr = oldV === undefined || oldV === null || oldV === '' ? '-' : String(oldV);
        const newStr = newV === undefined || newV === null || newV === '' ? '-' : String(newV);
        if (oldStr !== newStr) {
          changes.push({ field, oldValue: oldStr, newValue: newStr });
        }
      };

      // SKU Identification
      compare('Internal SKU', original.internalSku, sku.internalSku);
      compare('Article Code', original.articleCode, sku.articleCode);
      compare('Global Identifier', original.globalIdentifier, sku.globalIdentifier);
      compare('Global Identifier Number', original.globalIdentifierNumber, sku.globalIdentifierNumber);
      compare('Brand SKU', original.brandSku, sku.brandSku);
      compare('Brand', original.brand, sku.brand);

      // Product Classification
      compare('Category', original.category, sku.category);
      compare('Sub Category', original.subCategory, sku.subCategory);
      compare('Product Name (EN)', original.productNameEn, sku.productNameEn);
      compare('Product Name (Local)', original.productNameLocal, sku.productNameLocal);
      compare('Description (EN)', original.descriptionEn, sku.descriptionEn);
      compare('Description (Local)', original.descriptionLocal, sku.descriptionLocal);
      compare('Gender', original.gender, sku.gender);
      compare('Age Group', original.ageGroup, sku.ageGroup);
      compare('Material', original.material, sku.material);
      compare('Care Instructions', original.careInstructions, sku.careInstructions);
      compare('Fit Type', original.fitType, sku.fitType);
      compare('Color', original.color, sku.color);
      compare('Size', original.size, sku.size);
      compare('Size System', original.sizeSystem, sku.sizeSystem);
      compare('Season', original.season, sku.season);
      compare('Collection', original.collection, sku.collection);
      compare('Warranty', original.warranty, sku.warranty);

      // Physical Attributes
      compare('Shelf Life', original.shelfLife, sku.shelfLife);
      compare('Case Pack Qty', original.casePackQty, sku.casePackQty);
      compare('Product Length', original.productLength, sku.productLength);
      compare('Product Width', original.productWidth, sku.productWidth);
      compare('Product Height', original.productHeight, sku.productHeight);
      compare('Package Length', original.packageLength, sku.packageLength);
      compare('Package Width', original.packageWidth, sku.packageWidth);
      compare('Package Height', original.packageHeight, sku.packageHeight);
      compare('Gross Weight', original.grossWeight, sku.grossWeight);
      compare('Volumetric Weight', original.volumetricWeight, sku.volumetricWeight);
      compare('Shipping Weight', original.shippingWeight, sku.shippingWeight);
      compare('Storage Condition', original.storageCondition, sku.storageCondition);

      // Catalog & Content
      compare('Catalog Link', original.catalogLink, sku.catalogLink);
      compare('Video URLs', original.videoUrls, sku.videoUrls);
      compare('Product Images', original.productImages, sku.productImages);

      // Compliance
      compare('Sample Label Warning', original.sampleLabelWarning, sku.sampleLabelWarning);
      compare('Certification', original.certification, sku.certification);
      compare('HSN Code', original.hsnCode, sku.hsnCode);
      compare('Tax Rate', original.taxRate, sku.taxRate);
      compare('Tax Type', original.taxType, sku.taxType);
      compare('Default MRP', original.defaultMrp, sku.defaultMrp);

      compare('Status', original.status, sku.status);
    }

    setCurrentReviewRecord(sku);
    setDetectedChanges(changes);
    setShowApprovalModal(true);
  };

  const handleApprove = async () => {
    if (currentReviewRecord) {
      const nextRecords = await applyMasterApprovalAction('sku_master', skus, currentReviewRecord.id, 'approve');
      setSKUs(nextRecords);
    }
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
  };

  const handleReject = async () => {
    if (currentReviewRecord) {
      const nextRecords = await applyMasterApprovalAction('sku_master', skus, currentReviewRecord.id, 'reject');
      setSKUs(nextRecords);
    }
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
  };

  const handleRequestInfo = async () => {
    if (currentReviewRecord) {
      const comments = window.prompt('Enter comments for the request:', '');
      if (comments === null) return;
      const nextRecords = await applyMasterApprovalAction('sku_master', skus, currentReviewRecord.id, 'request_info', comments);
      setSKUs(nextRecords);
    }
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
  };

  const getStatusBadgeStyle = (approvalStatus: string) => {
    switch (approvalStatus) {
      case 'Approved':
        return { backgroundColor: 'var(--color-teal-tint)', color: 'var(--color-teal)' };
      case 'Pending Approval':
        return { backgroundColor: '#FFF9E6', color: '#D97706' };
      case 'Draft':
        return { backgroundColor: '#E5E7EB', color: 'var(--color-mercury-grey)' };
      case 'Rejected':
        return { backgroundColor: '#FFE8EA', color: 'var(--color-error)' };
      default:
        return { backgroundColor: '#E5E7EB', color: 'var(--color-mercury-grey)' };
    }
  };

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const completeness = useMemo(() => {
    const fields = [
      internalSku,
      articleCode,
      productNameEn,
      brand,
      category,
      subCategory,
      hsnCode,
      taxRate,
      defaultMrp,
      status,
    ];
    const filled = fields.filter((v) => String(v).trim().length > 0).length;
    return { filled, total: fields.length };
  }, [internalSku, articleCode, productNameEn, brand, category, subCategory, hsnCode, taxRate, defaultMrp, status]);

  const handleSaveDraft = useCallback(() => {
    setSaveStatus('saving');
    handleSubmit('Draft');
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 3000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleSubmit]);

  useFormKeyboardSave(handleSaveDraft);

  if (showForm) {
    return (
      <FormShell masterName="SKU Master"
        title="SKU Master"
        subtitle="Define a sellable stock keeping unit with full product, classification, and compliance metadata"
        modeLabel={isEditMode ? 'Edit SKU' : 'Create SKU'}
        draftStatus={isEditMode ? 'Draft' : 'New'}
        completeness={completeness}
        onBack={() => {
          setShowForm(false);
          resetForm();
        }}
        onCancel={() => {
          setShowForm(false);
          resetForm();
        }}
        onSaveDraft={handleSaveDraft}
        onSubmit={() => handleSubmit('Pending Approval')}
        submitLabel="Submit"
        draftLabel="Save Draft"
        saveStatus={saveStatus}
      >
        {/* 1. SKU Identification */}
        <FormSection title="SKU Identification" columns={3}>
          <PxFormField label="Internal SKU" required filled={!!internalSku.trim()} hint="Your internal SKU code">
            <input type="text" value={internalSku} onChange={(e) => setInternalSku(e.target.value)} placeholder="SKU-TSHIRT-BLK-M" className="px-input" />
          </PxFormField>
          <PxFormField label="Article Code" required filled={!!articleCode.trim()}>
            <input type="text" value={articleCode} onChange={(e) => setArticleCode(e.target.value)} placeholder="ART-10001" className="px-input" />
          </PxFormField>
          <PxFormField label="Global Identifier" filled={!!globalIdentifier}>
            <select value={globalIdentifier} onChange={(e) => setGlobalIdentifier(e.target.value)} className="px-select">
              <option value="">Select type</option>
              {GLOBAL_IDENTIFIER_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </PxFormField>
          <PxFormField label="Global Identifier Number" filled={!!globalIdentifierNumber.trim()}>
            <input type="text" value={globalIdentifierNumber} onChange={(e) => setGlobalIdentifierNumber(e.target.value)} placeholder="8901234567890" className="px-input" />
          </PxFormField>
          <PxFormField label="Brand SKU" filled={!!brandSku.trim()}>
            <input type="text" value={brandSku} onChange={(e) => setBrandSku(e.target.value)} placeholder="Brand's SKU reference" className="px-input" />
          </PxFormField>
          <PxFormField label="Brand" filled={!!brand}>
            <input
              list="sku-brand-options"
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Select or type brand"
              className="px-input"
            />
            <datalist id="sku-brand-options">
              {brandOptions.map((opt) => (
                <option key={opt} value={opt} />
              ))}
            </datalist>
          </PxFormField>
        </FormSection>

        {/* 2. Product Classification */}
        <FormSection title="Product Classification" columns={3}>
          <PxFormField label="Category" filled={!!category}>
            <input
              list="sku-category-options"
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Apparel"
              className="px-input"
            />
            <datalist id="sku-category-options">
              {categoryOptions.map((opt) => (
                <option key={opt} value={opt} />
              ))}
            </datalist>
          </PxFormField>
          <PxFormField label="Sub Category" filled={!!subCategory}>
            <input
              list="sku-subcategory-options"
              type="text"
              value={subCategory}
              onChange={(e) => setSubCategory(e.target.value)}
              placeholder="T-Shirts"
              className="px-input"
            />
            <datalist id="sku-subcategory-options">
              {subCategoryOptions.map((opt) => (
                <option key={opt} value={opt} />
              ))}
            </datalist>
          </PxFormField>
          <PxFormField label="Product Name (EN)" filled={!!productNameEn.trim()}>
            <input type="text" value={productNameEn} onChange={(e) => setProductNameEn(e.target.value)} placeholder="Classic Crew Tee" className="px-input" />
          </PxFormField>
          <PxFormField label="Product Name (Local)" filled={!!productNameLocal.trim()}>
            <input type="text" value={productNameLocal} onChange={(e) => setProductNameLocal(e.target.value)} placeholder="स्थानीय भाषा में नाम" className="px-input" />
          </PxFormField>
          <PxFormField label="Description (EN)" filled={!!descriptionEn.trim()}>
            <input type="text" value={descriptionEn} onChange={(e) => setDescriptionEn(e.target.value)} placeholder="Short product description" className="px-input" />
          </PxFormField>
          <PxFormField label="Description (Local)" filled={!!descriptionLocal.trim()}>
            <input type="text" value={descriptionLocal} onChange={(e) => setDescriptionLocal(e.target.value)} placeholder="स्थानीय भाषा में विवरण" className="px-input" />
          </PxFormField>
          <PxFormField label="Gender" filled={!!gender}>
            <select value={gender} onChange={(e) => setGender(e.target.value)} className="px-select">
              <option value="">Select gender</option>
              {GENDER_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </PxFormField>
          <PxFormField label="Age Group" filled={!!ageGroup}>
            <select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)} className="px-select">
              <option value="">Select age group</option>
              {AGE_GROUP_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </PxFormField>
          {/* TODO: dropdown from material_master */}
          <PxFormField label="Material" filled={!!material.trim()}>
            <input type="text" value={material} onChange={(e) => setMaterial(e.target.value)} placeholder="Cotton, Polyester..." className="px-input" />
          </PxFormField>
          <PxFormField label="Care Instructions" filled={!!careInstructions}>
            <select value={careInstructions} onChange={(e) => setCareInstructions(e.target.value)} className="px-select">
              <option value="">Select instructions</option>
              {CARE_INSTRUCTION_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </PxFormField>
          <PxFormField label="Fit Type" filled={!!fitType}>
            <select value={fitType} onChange={(e) => setFitType(e.target.value)} className="px-select">
              <option value="">Select fit</option>
              {FIT_TYPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </PxFormField>
          {/* TODO: dropdown from color_master */}
          <PxFormField label="Color" filled={!!color.trim()}>
            <input type="text" value={color} onChange={(e) => setColor(e.target.value)} placeholder="Black" className="px-input" />
          </PxFormField>
          {/* TODO: dropdown from size_master */}
          <PxFormField label="Size" filled={!!size.trim()}>
            <input type="text" value={size} onChange={(e) => setSize(e.target.value)} placeholder="M" className="px-input" />
          </PxFormField>
          <PxFormField label="Size System" filled={!!sizeSystem}>
            <select value={sizeSystem} onChange={(e) => setSizeSystem(e.target.value)} className="px-select">
              <option value="">Select system</option>
              {SIZE_SYSTEM_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </PxFormField>
          <PxFormField label="Season" filled={!!season.trim()}>
            <input type="text" value={season} onChange={(e) => setSeason(e.target.value)} placeholder="SS25, FW25" className="px-input" />
          </PxFormField>
          <PxFormField label="Collection" filled={!!collection.trim()}>
            <input type="text" value={collection} onChange={(e) => setCollection(e.target.value)} placeholder="Essentials" className="px-input" />
          </PxFormField>
          <PxFormField label="Warranty" filled={!!warranty.trim()}>
            <input type="text" value={warranty} onChange={(e) => setWarranty(e.target.value)} placeholder="12 months" className="px-input" />
          </PxFormField>
        </FormSection>

        {/* 3. Physical Attributes */}
        <FormSection title="Physical Attributes" columns={3}>
          <PxFormField label="Shelf Life" filled={!!shelfLife.trim()} hint="MM/yyyy format">
            <input type="text" value={shelfLife} onChange={(e) => setShelfLife(e.target.value)} placeholder="12/2028" className="px-input" />
          </PxFormField>
          <PxFormField label="Case Pack Qty" filled={!!casePackQty}>
            <input type="number" value={casePackQty} onChange={(e) => setCasePackQty(e.target.value)} placeholder="24" className="px-input" />
          </PxFormField>
          <PxFormField label="Product Length (cm)" filled={!!productLength}>
            <input type="number" value={productLength} onChange={(e) => setProductLength(e.target.value)} placeholder="70" className="px-input" />
          </PxFormField>
          <PxFormField label="Product Width (cm)" filled={!!productWidth}>
            <input type="number" value={productWidth} onChange={(e) => setProductWidth(e.target.value)} placeholder="50" className="px-input" />
          </PxFormField>
          <PxFormField label="Product Height (cm)" filled={!!productHeight}>
            <input type="number" value={productHeight} onChange={(e) => setProductHeight(e.target.value)} placeholder="1" className="px-input" />
          </PxFormField>
          <PxFormField label="Package Length (cm)" filled={!!packageLength}>
            <input type="number" value={packageLength} onChange={(e) => setPackageLength(e.target.value)} placeholder="30" className="px-input" />
          </PxFormField>
          <PxFormField label="Package Width (cm)" filled={!!packageWidth}>
            <input type="number" value={packageWidth} onChange={(e) => setPackageWidth(e.target.value)} placeholder="25" className="px-input" />
          </PxFormField>
          <PxFormField label="Package Height (cm)" filled={!!packageHeight}>
            <input type="number" value={packageHeight} onChange={(e) => setPackageHeight(e.target.value)} placeholder="3" className="px-input" />
          </PxFormField>
          <PxFormField label="Gross Weight (kg)" filled={!!grossWeight}>
            <input type="number" step="0.01" value={grossWeight} onChange={(e) => setGrossWeight(e.target.value)} placeholder="0.25" className="px-input" />
          </PxFormField>
          <PxFormField label="Volumetric Weight (kg)" filled={!!volumetricWeight}>
            <input type="number" step="0.01" value={volumetricWeight} onChange={(e) => setVolumetricWeight(e.target.value)} placeholder="0.45" className="px-input" />
          </PxFormField>
          <PxFormField label="Shipping Weight (kg)" filled={!!shippingWeight}>
            <input type="number" step="0.01" value={shippingWeight} onChange={(e) => setShippingWeight(e.target.value)} placeholder="0.3" className="px-input" />
          </PxFormField>
          <PxFormField label="Storage Condition" filled={!!storageCondition}>
            <select value={storageCondition} onChange={(e) => setStorageCondition(e.target.value)} className="px-select">
              <option value="">Select condition</option>
              {STORAGE_CONDITION_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </PxFormField>
        </FormSection>

        {/* 4. Catalog & Content */}
        <FormSection title="Catalog & Content" columns={3}>
          <PxFormField label="Catalog Link" filled={!!catalogLink.trim()}>
            <input type="url" value={catalogLink} onChange={(e) => setCatalogLink(e.target.value)} placeholder="https://..." className="px-input" />
          </PxFormField>
          <PxFormField label="Video URLs" filled={!!videoUrls.trim()} hint="Comma-separated">
            <input type="text" value={videoUrls} onChange={(e) => setVideoUrls(e.target.value)} placeholder="https://youtu.be/...,https://..." className="px-input" />
          </PxFormField>
          <PxFormField label="Product Images" filled={!!productImages.trim()} hint="Comma-separated URLs" colSpan={3}>
            <input type="text" value={productImages} onChange={(e) => setProductImages(e.target.value)} placeholder="https://cdn.../img1.jpg, https://cdn.../img2.jpg" className="px-input" />
          </PxFormField>
        </FormSection>

        {/* 5. Compliance */}
        <FormSection title="Compliance" columns={3}>
          <PxFormField label="Sample Label Warning" filled={!!sampleLabelWarning}>
            <select value={sampleLabelWarning} onChange={(e) => setSampleLabelWarning(e.target.value)} className="px-select">
              <option value="">Select warning</option>
              {SAMPLE_LABEL_WARNING_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </PxFormField>
          <PxFormField label="Certification" filled={!!certification}>
            <select value={certification} onChange={(e) => setCertification(e.target.value)} className="px-select">
              <option value="">Select certification</option>
              {CERTIFICATION_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </PxFormField>
          <PxFormField label="HSN Code" filled={!!hsnCode}>
            <input
              list="sku-hsn-options"
              type="text"
              value={hsnCode}
              onChange={(e) => setHsnCode(e.target.value)}
              placeholder="6109"
              className="px-input"
            />
            <datalist id="sku-hsn-options">
              {hsnOptions.map((opt) => (
                <option key={opt} value={opt} />
              ))}
            </datalist>
          </PxFormField>
          <PxFormField label="Tax Rate (%)" filled={!!taxRate}>
            <input type="number" step="0.01" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} placeholder="12" className="px-input" />
          </PxFormField>
          <PxFormField label="Tax Type" filled={!!taxType}>
            <select value={taxType} onChange={(e) => setTaxType(e.target.value)} className="px-select">
              <option value="">Select tax type</option>
              {TAX_TYPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </PxFormField>
          <PxFormField label="Default MRP" filled={!!defaultMrp}>
            <input type="number" step="0.01" value={defaultMrp} onChange={(e) => setDefaultMrp(e.target.value)} placeholder="799" className="px-input" />
          </PxFormField>
          <PxFormField label="Status" required filled={!!status}>
            <select value={status} onChange={(e) => setStatus(e.target.value as 'Active' | 'Inactive')} className="px-select">
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </PxFormField>
        </FormSection>

        {/* 6. Entity Mapping */}
        <FormSection title="Entity Mapping" columns={1}>
          <EntityMappingSelector value={entityMappings} onChange={setEntityMappings} />
        </FormSection>
      </FormShell>
    );
  }

  return (
    <MasterPageShell masterName="SKU Master" description="Manage stock keeping units">
      <div className="flex items-center justify-end mb-8">
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-6 py-3 rounded-lg text-white transition-colors"
          style={{ backgroundColor: 'var(--color-teal)' }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-teal-dark)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-teal)')}
        >
          <Plus className="w-5 h-5" />
          {isHydrating ? 'Loading...' : 'Add SKU'}
        </button>
      </div>

      {/* Approval Modal */}
      <ApprovalModal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        recordType="SKU Master"
        recordId={currentReviewRecord?.articleCode || ''}
        changes={detectedChanges}
        onApprove={handleApprove}
        onReject={handleReject}
        onRequestInfo={handleRequestInfo}
      />

      <MasterListToolbar
        masterName="SKU Master"
        masterKey="sku_master"
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filters={[
          { key: 'category', label: 'Category', options: [...new Set(sortedSKUs.map((s) => s.category || '').filter(Boolean))], selected: categoryFilter },
          { key: 'status', label: 'Status', options: ['Active', 'Inactive'], selected: statusFilter },
          { key: 'approval', label: 'Approval', options: ['Draft', 'Pending Approval', 'Approved', 'Rejected'], selected: approvalFilter },
        ]}
        onFilterChange={(key, values) => {
          if (key === 'category') setCategoryFilter(values);
          if (key === 'status') setStatusFilter(values);
          if (key === 'approval') setApprovalFilter(values);
        }}
        records={filteredSKUs}
        columns={[
          { key: 'internalSku', label: 'Internal SKU' },
          { key: 'articleCode', label: 'Article Code' },
          { key: 'globalIdentifier', label: 'Global Identifier' },
          { key: 'globalIdentifierNumber', label: 'Global Identifier Number' },
          { key: 'brandSku', label: 'Brand SKU' },
          { key: 'brand', label: 'Brand' },
          { key: 'category', label: 'Category' },
          { key: 'subCategory', label: 'Sub Category' },
          { key: 'productNameEn', label: 'Product Name (EN)' },
          { key: 'productNameLocal', label: 'Product Name (Local)' },
          { key: 'descriptionEn', label: 'Description (EN)' },
          { key: 'descriptionLocal', label: 'Description (Local)' },
          { key: 'gender', label: 'Gender' },
          { key: 'ageGroup', label: 'Age Group' },
          { key: 'material', label: 'Material' },
          { key: 'careInstructions', label: 'Care Instructions' },
          { key: 'fitType', label: 'Fit Type' },
          { key: 'color', label: 'Color' },
          { key: 'size', label: 'Size' },
          { key: 'sizeSystem', label: 'Size System' },
          { key: 'season', label: 'Season' },
          { key: 'collection', label: 'Collection' },
          { key: 'warranty', label: 'Warranty' },
          { key: 'shelfLife', label: 'Shelf Life' },
          { key: 'casePackQty', label: 'Case Pack Qty' },
          { key: 'productLength', label: 'Product Length' },
          { key: 'productWidth', label: 'Product Width' },
          { key: 'productHeight', label: 'Product Height' },
          { key: 'packageLength', label: 'Package Length' },
          { key: 'packageWidth', label: 'Package Width' },
          { key: 'packageHeight', label: 'Package Height' },
          { key: 'grossWeight', label: 'Gross Weight' },
          { key: 'volumetricWeight', label: 'Volumetric Weight' },
          { key: 'shippingWeight', label: 'Shipping Weight' },
          { key: 'storageCondition', label: 'Storage Condition' },
          { key: 'catalogLink', label: 'Catalog Link' },
          { key: 'videoUrls', label: 'Video URLs' },
          { key: 'productImages', label: 'Product Images' },
          { key: 'sampleLabelWarning', label: 'Sample Label Warning' },
          { key: 'certification', label: 'Certification' },
          { key: 'hsnCode', label: 'HSN Code' },
          { key: 'taxRate', label: 'Tax Rate' },
          { key: 'taxType', label: 'Tax Type' },
          { key: 'defaultMrp', label: 'Default MRP' },
          { key: 'status', label: 'Status' },
          { key: 'entityMappings', label: 'Entity Mappings' },
          { key: 'approvalStatus', label: 'Approval Status' },
        ]}
      />

      {/* Table */}
      <div className="rounded-[24px] overflow-hidden bg-white" style={{ border: '1px solid var(--color-fog)', boxShadow: '0 18px 42px rgba(15, 23, 42, 0.06)' }}>
        <div className="overflow-x-auto">
          <div style={{ minWidth: '1320px' }}>
            <div className="grid gap-4 px-6 py-4" style={{ gridTemplateColumns: '1.2fr 1.4fr 1.8fr 1.1fr 1.2fr 0.9fr 1.2fr 0.9fr', background: 'linear-gradient(180deg, #F8FBFD 0%, #F3F8FB 100%)', borderBottom: '1px solid #E4EDF2' }}>
              {['Article Code', 'Internal SKU', 'Product Name (EN)', 'Brand', 'Category', 'Status', 'Approval', 'Action'].map((column) => (
                <div key={column} className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--color-mercury-grey)', fontWeight: 700 }}>
                  {column}
                </div>
              ))}
            </div>

            <div>
              {filteredSKUs.map((sku, index) => (
                <div
                  key={sku.id}
                  className="grid gap-4 px-6 py-4"
                  style={{
                    gridTemplateColumns: '1.2fr 1.4fr 1.8fr 1.1fr 1.2fr 0.9fr 1.2fr 0.9fr',
                    borderBottom: index === filteredSKUs.length - 1 ? 'none' : '1px solid #EDF3F7',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <div style={{ color: 'var(--color-ink)', fontWeight: 700 }}>{sku.articleCode}</div>
                  <div style={{ color: 'var(--color-ink)' }}>{sku.internalSku}</div>
                  <div style={{ color: 'var(--color-mercury-grey)' }}>{sku.productNameEn || '-'}</div>
                  <div style={{ color: 'var(--color-mercury-grey)' }}>{sku.brand || '-'}</div>
                  <div style={{ color: 'var(--color-mercury-grey)' }}>{sku.category || '-'}</div>
                  <div>
                    <span
                      className="px-3 py-1.5 rounded-full text-xs"
                      style={{
                        backgroundColor: sku.status === 'Active' ? 'var(--color-teal-tint)' : '#FFE8EA',
                        color: sku.status === 'Active' ? 'var(--color-teal)' : 'var(--color-error)',
                        fontWeight: 700,
                      }}
                    >
                      {sku.status}
                    </span>
                  </div>
                  <div>
                    <span className="px-3 py-1.5 rounded-full text-xs" style={{ ...getStatusBadgeStyle(sku.approvalStatus), fontWeight: 700 }}>
                      {sku.approvalStatus}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    {sku.approvalStatus === 'Pending Approval' && (
                      <PremiumActionButton label="Review SKU" icon={<Eye className="w-4 h-4" />} tone="teal" onClick={() => handleReview(sku)} />
                    )}
                    <PremiumActionButton label="Edit SKU" icon={<Edit className="w-4 h-4" />} tone="violet" onClick={() => handleEdit(sku)} />
                    <PremiumActionButton label="Open SKU" icon={<ArrowUpRight className="w-4 h-4" />} tone="blue" onClick={() => handleEdit(sku)} />
                    <PremiumActionButton label="Delete SKU" icon={<Trash2 className="w-4 h-4" />} tone="amber" onClick={() => handleDelete(sku.id)} />
                  </div>
                </div>
              ))}
              {filteredSKUs.length === 0 && (
                <div className="px-8 py-16 text-center">
                  <p className="text-base mb-1" style={{ color: 'var(--color-ink)', fontWeight: 700 }}>No SKUs match the current filters</p>
                  <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Clear one or more filters to bring the full register back.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MasterPageShell>
  );
}
