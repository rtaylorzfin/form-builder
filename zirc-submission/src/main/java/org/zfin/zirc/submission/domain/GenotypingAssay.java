package org.zfin.zirc.submission.domain;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "genotyping_assay")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GenotypingAssay {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mutation_id", nullable = false)
    private Mutation mutation;

    private Integer sortOrder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assay_type")
    private AssayTypeOption assayType;

    private String forwardPrimer;
    private String reversePrimer;
    private String expectedWtPcr;
    private String expectedMutPcr;
    private String restrictionEnzyme;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "enzyme_cleaves")
    private EnzymeCleaves enzymeCleaves;

    private String expectedWtDigest;
    private String expectedMutDigest;

    @Column(columnDefinition = "text")
    private String additionalInfo;
}
