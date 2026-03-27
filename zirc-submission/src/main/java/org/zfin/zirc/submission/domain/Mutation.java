package org.zfin.zirc.submission.domain;

import jakarta.persistence.*;
import lombok.*;

import java.util.*;

@Entity
@Table(name = "mutation")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Mutation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "line_submission_id", nullable = false)
    private LineSubmission lineSubmission;

    private Integer sortOrder;

    // -- General Info --

    private String alleleDesignation;
    private String mutagenesisProtocol;
    private Boolean molecularlyCharacterized;

    // -- Phenotyping General Info --

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mutation_type")
    private MutationTypeOption mutationType;

    // -- Lethality --

    private Boolean homozygousLethal;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lethality_stage_type")
    private LethalityStageTypeOption lethalityStageType;

    private String lethalitySpecificTimepoint;
    private String lethalityWindowStart;
    private String lethalityWindowEnd;

    @Column(columnDefinition = "text")
    private String lethalityAdditionalInfo;

    // -- Finalization --

    private Boolean zfinRecordEstablished;
    private String zdbGenomicFeature;
    private String mutationDiscoverer;
    private String mutationInstitution;

    @ElementCollection
    @CollectionTable(name = "mutation_publication",
            joinColumns = @JoinColumn(name = "mutation_id"))
    @Column(name = "publication")
    @OrderColumn(name = "sort_order")
    @Builder.Default
    private List<String> publications = new ArrayList<>();

    // -- Child collections --

    @OneToMany(mappedBy = "mutation", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder")
    @Builder.Default
    private List<Gene> genes = new ArrayList<>();

    @OneToMany(mappedBy = "mutation", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder")
    @Builder.Default
    private List<Lesion> lesions = new ArrayList<>();

    @OneToMany(mappedBy = "mutation", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder")
    @Builder.Default
    private List<GenotypingAssay> genotypingAssays = new ArrayList<>();

    @OneToMany(mappedBy = "mutation", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder")
    @Builder.Default
    private List<Phenotype> phenotypes = new ArrayList<>();
}
