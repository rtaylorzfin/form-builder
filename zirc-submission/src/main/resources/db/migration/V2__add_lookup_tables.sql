-- Lookup tables for all option-based fields
-- Each has: value (PK), label (display text), sort_order, active flag

CREATE TABLE reason_option (
    value      VARCHAR(255) PRIMARY KEY,
    label      VARCHAR(255) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    active     BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE mutation_type_option (
    value      VARCHAR(255) PRIMARY KEY,
    label      VARCHAR(255) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    active     BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE lethality_stage_type_option (
    value      VARCHAR(255) PRIMARY KEY,
    label      VARCHAR(255) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    active     BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE lesion_type_option (
    value      VARCHAR(255) PRIMARY KEY,
    label      VARCHAR(255) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    active     BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE assay_type_option (
    value      VARCHAR(255) PRIMARY KEY,
    label      VARCHAR(255) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    active     BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE enzyme_cleaves_option (
    value      VARCHAR(255) PRIMARY KEY,
    label      VARCHAR(255) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    active     BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE segregation_option (
    value      VARCHAR(255) PRIMARY KEY,
    label      VARCHAR(255) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    active     BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE phenotype_type_option (
    value      VARCHAR(255) PRIMARY KEY,
    label      VARCHAR(255) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    active     BOOLEAN NOT NULL DEFAULT true
);

-- Add foreign keys from existing tables to lookup tables

ALTER TABLE line_submission_reason
    ADD CONSTRAINT fk_reason_option
    FOREIGN KEY (reason) REFERENCES reason_option(value);

ALTER TABLE mutation
    ADD CONSTRAINT fk_mutation_type_option
    FOREIGN KEY (mutation_type) REFERENCES mutation_type_option(value);

ALTER TABLE mutation
    ADD CONSTRAINT fk_lethality_stage_type_option
    FOREIGN KEY (lethality_stage_type) REFERENCES lethality_stage_type_option(value);

ALTER TABLE lesion
    ADD CONSTRAINT fk_lesion_type_option
    FOREIGN KEY (lesion_type) REFERENCES lesion_type_option(value);

ALTER TABLE genotyping_assay
    ADD CONSTRAINT fk_assay_type_option
    FOREIGN KEY (assay_type) REFERENCES assay_type_option(value);

ALTER TABLE genotyping_assay
    ADD CONSTRAINT fk_enzyme_cleaves_option
    FOREIGN KEY (enzyme_cleaves) REFERENCES enzyme_cleaves_option(value);

ALTER TABLE phenotype_segregation
    ADD CONSTRAINT fk_segregation_option
    FOREIGN KEY (segregation) REFERENCES segregation_option(value);

ALTER TABLE phenotype_type
    ADD CONSTRAINT fk_phenotype_type_option
    FOREIGN KEY (type) REFERENCES phenotype_type_option(value);

-- Seed data

INSERT INTO reason_option (value, label, sort_order) VALUES
    ('groundbreaking', 'This line is groundbreaking', 0),
    ('researcher_demand', 'Researchers demand it', 1),
    ('unique_background', 'Unique genetic background', 2),
    ('clinical_studies', 'Supports ongoing clinical studies', 3),
    ('community_interest', 'High community interest', 4);

INSERT INTO mutation_type_option (value, label, sort_order) VALUES
    ('null', 'Null (complete loss of function)', 0),
    ('hypomorphic', 'Hypomorphic (partial loss of function)', 1),
    ('hypermorphic', 'Hypermorphic (gain of function, increased activity)', 2),
    ('neomorphic', 'Neomorphic (gain of function, new function)', 3),
    ('unknown', 'Unknown', 4);

INSERT INTO lethality_stage_type_option (value, label, sort_order) VALUES
    ('specific', 'A specific developmental time point', 0),
    ('temporal_window', 'A temporal window', 1);

INSERT INTO lesion_type_option (value, label, sort_order) VALUES
    ('point_mutation', 'Point mutation', 0),
    ('deletion', 'Deletion (deficiency)', 1),
    ('insertion', 'Insertion', 2),
    ('indel', 'Indel (delins)', 3),
    ('duplication', 'Duplication', 4),
    ('inversion', 'Inversion', 5),
    ('translocation', 'Translocation', 6),
    ('transgene', 'Transgene', 7),
    ('unknown', 'Unknown', 8);

INSERT INTO assay_type_option (value, label, sort_order) VALUES
    ('pcr_gel', 'PCR followed by gel electrophoresis', 0),
    ('pcr_sequencing', 'PCR followed by sequencing', 1),
    ('rflp', 'Restriction Fragment Length Polymorphism (RFLP)', 2),
    ('dcaps', 'Derived Cleaved Amplified Polymorphic Sequences (dCAPS)', 3),
    ('asa', 'Allele Specific Amplification (ASA)', 4),
    ('kasp', 'Kompetitive Allele Specific PCR (KASP)', 5),
    ('hrma', 'High-Resolution Melt Analysis (HRMA)', 6);

INSERT INTO enzyme_cleaves_option (value, label, sort_order) VALUES
    ('wt', 'WT', 0),
    ('mut', 'MUT', 1);

INSERT INTO segregation_option (value, label, sort_order) VALUES
    ('mendelian_recessive', 'Mendelian recessive', 0),
    ('mendelian_dominant', 'Mendelian dominant', 1),
    ('non_mendelian', 'Non-Mendelian', 2);

INSERT INTO phenotype_type_option (value, label, sort_order) VALUES
    ('zygotic', 'Zygotic (Z)', 0),
    ('maternal', 'Maternal (M)', 1),
    ('maternal_zygotic', 'Maternal – Zygotic (M-Z)', 2);
