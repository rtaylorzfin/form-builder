package org.zfin.zirc.submission.domain;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "lesion")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Lesion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mutation_id", nullable = false)
    private Mutation mutation;

    private Integer sortOrder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lesion_type")
    private LesionTypeOption lesionType;

    private Integer indelDeletionSize;
    private Integer indelInsertionSize;
    private String deletedBasePairs;
    private String insertedBasePairs;

    @Column(columnDefinition = "text")
    private String wtGenomicSequence;

    @Column(columnDefinition = "text")
    private String mutGenomicSequence;

    private String mutatedAminoAcids;

    @Column(columnDefinition = "text")
    private String additionalInfo;
}
