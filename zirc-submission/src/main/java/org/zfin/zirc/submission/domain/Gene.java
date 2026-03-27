package org.zfin.zirc.submission.domain;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "gene")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Gene {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mutation_id", nullable = false)
    private Mutation mutation;

    private Integer sortOrder;

    private String mutatedGene;
    private String linkageGroup;
    private String genbankGenomicDna;
    private String genbankCdna;
}
