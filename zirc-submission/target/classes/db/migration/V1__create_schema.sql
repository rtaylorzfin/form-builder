-- Line Submission (root entity)
CREATE TABLE line_submission (
    id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                            VARCHAR(255) NOT NULL,
    abbreviation                    VARCHAR(255),
    previous_names                  TEXT,

    -- Linked Features
    features_linked                 BOOLEAN,
    distance_known                  BOOLEAN,
    distance_centimorgans           DOUBLE PRECISION,
    distance_megabases              DOUBLE PRECISION,
    linked_features_additional_info TEXT,

    -- Line Background
    maternal_background             VARCHAR(255),
    paternal_background             VARCHAR(255),
    background_changeable           BOOLEAN,
    background_change_concerns      TEXT,
    unreported_features             BOOLEAN,
    unreported_features_details     TEXT,

    additional_info                 TEXT,

    created_at                      TIMESTAMP NOT NULL DEFAULT now(),
    updated_at                      TIMESTAMP NOT NULL DEFAULT now()
);

-- Reasons to accept (checkbox group on LineSubmission)
CREATE TABLE line_submission_reason (
    line_submission_id UUID NOT NULL REFERENCES line_submission(id) ON DELETE CASCADE,
    reason             VARCHAR(255) NOT NULL,
    PRIMARY KEY (line_submission_id, reason)
);

-- Linked features (checkbox group on LineSubmission)
CREATE TABLE line_submission_linked_feature (
    line_submission_id UUID NOT NULL REFERENCES line_submission(id) ON DELETE CASCADE,
    feature            VARCHAR(255) NOT NULL,
    PRIMARY KEY (line_submission_id, feature)
);

-- Mutation (repeatable, 0..5 per line)
CREATE TABLE mutation (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    line_submission_id          UUID NOT NULL REFERENCES line_submission(id) ON DELETE CASCADE,
    sort_order                  INTEGER NOT NULL DEFAULT 0,

    -- General Info
    allele_designation          VARCHAR(255),
    mutagenesis_protocol        VARCHAR(255),
    molecularly_characterized   BOOLEAN,

    -- Phenotyping General Info
    mutation_type               VARCHAR(255),

    -- Lethality
    homozygous_lethal           BOOLEAN,
    lethality_stage_type        VARCHAR(50),
    lethality_specific_timepoint VARCHAR(255),
    lethality_window_start      VARCHAR(255),
    lethality_window_end        VARCHAR(255),
    lethality_additional_info   TEXT,

    -- Finalization
    zfin_record_established     BOOLEAN,
    zdb_genomic_feature         VARCHAR(255),
    mutation_discoverer         VARCHAR(255),
    mutation_institution        VARCHAR(255)
);

CREATE INDEX idx_mutation_line ON mutation(line_submission_id);

-- Mutation publications (element collection)
CREATE TABLE mutation_publication (
    mutation_id UUID NOT NULL REFERENCES mutation(id) ON DELETE CASCADE,
    publication VARCHAR(500) NOT NULL,
    sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_mutation_publication_mutation ON mutation_publication(mutation_id);

-- Gene (repeatable, 0..10 per mutation)
CREATE TABLE gene (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mutation_id         UUID NOT NULL REFERENCES mutation(id) ON DELETE CASCADE,
    sort_order          INTEGER NOT NULL DEFAULT 0,
    mutated_gene        VARCHAR(255),
    linkage_group       VARCHAR(255),
    genbank_genomic_dna VARCHAR(255),
    genbank_cdna        VARCHAR(255)
);

CREATE INDEX idx_gene_mutation ON gene(mutation_id);

-- Lesion (repeatable, 0..10 per mutation)
CREATE TABLE lesion (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mutation_id           UUID NOT NULL REFERENCES mutation(id) ON DELETE CASCADE,
    sort_order            INTEGER NOT NULL DEFAULT 0,
    lesion_type           VARCHAR(100),
    indel_deletion_size   INTEGER,
    indel_insertion_size  INTEGER,
    deleted_base_pairs    VARCHAR(500),
    inserted_base_pairs   VARCHAR(500),
    wt_genomic_sequence   TEXT,
    mut_genomic_sequence  TEXT,
    mutated_amino_acids   VARCHAR(500),
    additional_info       TEXT
);

CREATE INDEX idx_lesion_mutation ON lesion(mutation_id);

-- Genotyping Assay (repeatable, 0..10 per mutation)
CREATE TABLE genotyping_assay (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mutation_id         UUID NOT NULL REFERENCES mutation(id) ON DELETE CASCADE,
    sort_order          INTEGER NOT NULL DEFAULT 0,
    assay_type          VARCHAR(100),
    forward_primer      VARCHAR(500),
    reverse_primer      VARCHAR(500),
    expected_wt_pcr     VARCHAR(255),
    expected_mut_pcr    VARCHAR(255),
    restriction_enzyme  VARCHAR(255),
    enzyme_cleaves      VARCHAR(10),
    expected_wt_digest  VARCHAR(255),
    expected_mut_digest VARCHAR(255),
    additional_info     TEXT
);

CREATE INDEX idx_genotyping_assay_mutation ON genotyping_assay(mutation_id);

-- Phenotype (repeatable, 0..10 per mutation)
CREATE TABLE phenotype (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mutation_id              UUID NOT NULL REFERENCES mutation(id) ON DELETE CASCADE,
    sort_order               INTEGER NOT NULL DEFAULT 0,
    description              TEXT,
    hours_post_fertilization INTEGER,
    stage                    VARCHAR(255),
    zirc_image_permission    BOOLEAN,
    non_mendelian_percentage DOUBLE PRECISION
);

CREATE INDEX idx_phenotype_mutation ON phenotype(mutation_id);

-- Phenotype segregation (checkbox group)
CREATE TABLE phenotype_segregation (
    phenotype_id UUID NOT NULL REFERENCES phenotype(id) ON DELETE CASCADE,
    segregation  VARCHAR(255) NOT NULL,
    PRIMARY KEY (phenotype_id, segregation)
);

-- Phenotype type (checkbox group)
CREATE TABLE phenotype_type (
    phenotype_id UUID NOT NULL REFERENCES phenotype(id) ON DELETE CASCADE,
    type         VARCHAR(255) NOT NULL,
    PRIMARY KEY (phenotype_id, type)
);
