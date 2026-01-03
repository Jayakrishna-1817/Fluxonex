public with sharing class SpeakerService {
    public class SpeakerDTO {
        @AuraEnabled public Id id;
        @AuraEnabled public String name;
        @AuraEnabled public String email;
        @AuraEnabled public String speciality;
        @AuraEnabled public String bio;
    }

    @AuraEnabled(cacheable=true)
public static List<SpeakerDTO> searchSpeakers(String name, String speciality) {
        if ((name == null || String.isBlank(name)) && (speciality == null || String.isBlank(speciality))) {
            return new List<SpeakerDTO>();
        }

        String nameLike = (name == null) ? null : '%' + name.trim() + '%';
        String specLike = (speciality == null) ? null : '%' + speciality.trim() + '%';

String base = 'SELECT Id, Name, Speciality__c FROM Speaker__c WHERE ';
        List<String> wheres = new List<String>();
        if (nameLike != null) {
            wheres.add('Name LIKE :nameLike');
        }
        if (specLike != null) {
            wheres.add('Speciality__c LIKE :specLike');
        }
        String soql = base + String.join(wheres, ' AND ') + ' ORDER BY Name LIMIT 200';

        List<SpeakerDTO> result = new List<SpeakerDTO>();
        for (Speaker__c s : Database.query(soql)) {
            SpeakerDTO dto = new SpeakerDTO();
            dto.id = s.Id;
            dto.name = s.Name;
dto.email = null;
            dto.speciality = (String)s.get('Speciality__c');
            result.add(dto);
        }
        return result;
    }

    @AuraEnabled(cacheable=true)
    public static SpeakerDTO getSpeakerDetails(Id speakerId) {
        if (speakerId == null) {
            return null;
        }
Speaker__c s = [
            SELECT Id, Name, Speciality__c, Bio__c
            FROM Speaker__c
            WHERE Id = :speakerId
            WITH SECURITY_ENFORCED
            LIMIT 1
        ];
        SpeakerDTO dto = new SpeakerDTO();
        dto.id = s.Id;
        dto.name = s.Name;
dto.email = null;
        dto.speciality = (String)s.get('Speciality__c');
        dto.bio = (String)s.get('Bio__c');
        return dto;
    }
}