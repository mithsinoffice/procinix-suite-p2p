import { useMemo } from 'react';
import { UserSquare2 } from 'lucide-react';
import {
  SimpleMasterScreenV2,
  type MasterV2Config,
  type MasterV2Field,
  type MasterV2Record,
} from './masters/SimpleMasterScreenV2';
import { useMasterData } from '../contexts/MasterDataContext';

/**
 * EmployeeMaster — bespoke columns surfaced through V2 chrome.
 *
 * Persistence: the server route `server/routes/masters.mjs` translates the
 * canonical V2 contract (records[] with payload.{firstName,lastName,…}) to
 * the bespoke `employee_master` table columns. V2 + useIncrementalMasterRecords
 * does the wire-up for us.
 *
 * FK fields use `dynamicOptions` + `labelKey` so the dropdown writes both
 * the id (e.g. departmentId) and the name (e.g. departmentName) in one
 * change — server uses both.
 */

const NAME_REGEX = /^[A-Za-z\s\-']{2,50}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const PHONE_REGEX = /^(\+91|0)?[6-9]\d{9}$/;

const validateName = (label: string) => (value: unknown) => {
  const s = String(value ?? '').trim();
  if (!s) return null; // required handled separately
  return NAME_REGEX.test(s)
    ? null
    : `${label} must be 2–50 letters (spaces, hyphen, apostrophe allowed)`;
};

const validateEmail = (value: unknown) => {
  const s = String(value ?? '')
    .trim()
    .toLowerCase();
  if (!s) return null;
  return EMAIL_REGEX.test(s) ? null : 'Email format is invalid';
};

const validatePhone = (value: unknown) => {
  const s = String(value ?? '').replace(/[\s\-()]/g, '');
  if (!s) return null;
  return PHONE_REGEX.test(s) ? null : 'Phone must be a valid Indian mobile number';
};

const validatePan = (value: unknown) => {
  const s = String(value ?? '')
    .toUpperCase()
    .trim();
  if (!s) return null; // optional
  return PAN_REGEX.test(s) ? null : 'PAN must match ABCDE1234F';
};

export function EmployeeMaster() {
  const { departments, designations, locations, costCentres, profitCentres, employees } =
    useMasterData();

  const departmentOptions = useMemo(
    () =>
      departments.map((d) => ({
        value: d.id,
        label: d.name || d.code,
      })),
    [departments]
  );

  const designationOptions = useMemo(
    () =>
      designations.map((d) => ({
        value: d.id,
        label: d.name || d.code,
      })),
    [designations]
  );

  const locationOptions = useMemo(
    () =>
      locations.map((l) => ({
        value: l.id,
        label: l.name || l.code || '',
      })),
    [locations]
  );

  const costCentreOptions = useMemo(
    () =>
      costCentres.map((c) => ({
        value: c.id,
        label: c.name || c.code,
      })),
    [costCentres]
  );

  const profitCentreOptions = useMemo(
    () =>
      profitCentres.map((p) => ({
        value: p.id,
        label: p.name || p.code,
      })),
    [profitCentres]
  );

  // For manager dropdown, exclude self when editing — done via a per-form
  // computation. Because V2 dynamicOptions are resolved once per config,
  // include all active employees here; the form-level validate can warn if
  // self-referential.
  const managerOptions = useMemo(
    () =>
      employees
        .filter((e) => String(e.status ?? 'active').toLowerCase() === 'active')
        .map((e) => ({
          value: e.id,
          label: `${e.firstName} ${e.lastName}`.trim() || e.code,
        })),
    [employees]
  );

  const config: MasterV2Config = {
    title: 'Employee Master',
    subtitle: 'People on the org chart — used by approvals, ownership and reporting.',
    icon: UserSquare2,
    masterKey: 'employee_master',
    codeKey: 'employeeCode',
    nameKey: 'fullName',
    suppressUniversalName: true,
    computeRecordName: (form) => {
      const first = String((form.firstName as string | undefined) ?? '').trim();
      const last = String((form.lastName as string | undefined) ?? '').trim();
      return `${first} ${last}`.trim();
    },
    columns: [
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'departmentName', label: 'Department' },
      { key: 'designationName', label: 'Designation' },
      { key: 'status', label: 'Status' },
    ],
    formSections: [
      {
        id: 'identity',
        title: 'Identity',
        subtitle: 'Code is auto-generated; first/last name are stored separately.',
        stripe: 'teal',
        fields: [
          {
            key: 'firstName',
            label: 'First name',
            required: true,
            validate: validateName('First name'),
          },
          {
            key: 'lastName',
            label: 'Last name',
            required: true,
            validate: validateName('Last name'),
          },
        ],
      },
      {
        id: 'contact',
        title: 'Contact + Employment',
        subtitle: 'Email + phone are unique per tenant. PAN is optional but must match ABCDE1234F.',
        stripe: 'blue',
        fields: [
          { key: 'email', label: 'Email', required: true, validate: validateEmail },
          { key: 'phone', label: 'Phone', required: true, validate: validatePhone },
          { key: 'panNumber', label: 'PAN', validate: validatePan, placeholder: 'ABCDE1234F' },
          { key: 'dateOfJoining', label: 'Date of joining', type: 'date' },
          {
            key: 'employmentType',
            label: 'Employment type',
            type: 'select',
            options: ['full_time', 'part_time', 'contract', 'intern'],
          },
          { key: 'dateOfLeaving', label: 'Date of leaving', type: 'date' },
        ],
      },
      {
        id: 'org',
        title: 'Organisational mapping',
        subtitle: 'Department, designation, location + accounting centres.',
        stripe: 'amber',
        fields: [
          dynamicSelectField('departmentId', 'Department', departmentOptions, 'departmentName'),
          dynamicSelectField('designationId', 'Designation', designationOptions, 'designationName'),
          dynamicSelectField('locationId', 'Location', locationOptions, 'locationName'),
          dynamicSelectField(
            'reportingManagerId',
            'Reporting manager',
            managerOptions,
            'reportingManagerName',
            (value, form) => {
              if (!value) return null;
              return String(value) === String(form.id) ? 'Cannot report to self' : null;
            }
          ),
          dynamicSelectField('costCentreId', 'Cost centre', costCentreOptions, 'costCentreName'),
          dynamicSelectField(
            'profitCentreId',
            'Profit centre',
            profitCentreOptions,
            'profitCentreName'
          ),
        ],
      },
    ],
  };

  return <SimpleMasterScreenV2 config={config} />;
}

function dynamicSelectField(
  key: string,
  label: string,
  options: Array<{ value: string; label: string }>,
  labelKey: string,
  validate?: (value: unknown, form: MasterV2Record) => string | null
): MasterV2Field {
  return {
    key,
    label,
    type: 'select',
    dynamicOptions: options,
    labelKey,
    validate,
  };
}
