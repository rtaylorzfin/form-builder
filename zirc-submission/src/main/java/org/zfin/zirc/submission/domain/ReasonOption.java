package org.zfin.zirc.submission.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "reason_option")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReasonOption {

    @Id
    private String value;

    @Column(nullable = false)
    private String label;

    @Column(nullable = false)
    private Integer sortOrder = 0;

    @Column(nullable = false)
    private Boolean active = true;
}
