import { LightningElement, track, wire } from 'lwc';
import { publish, MessageContext } from 'lightning/messageService';
import SPEAKER_SELECTION from '@salesforce/messageChannel/speakerSelection__c';

export default class SpeakerSearch extends LightningElement {
    static renderMode = 'light';
    static delegatesFocus = true;

    @track name = '';
    @track speciality = '';

    @wire(MessageContext) messageContext;

    get isSearchDisabled() {
        return !this.name && !this.speciality;
    }

    handleInputChange(event) {
        const { name, value } = event.target;
        if (name === 'name') {
            this.name = value;
        } else if (name === 'speciality') {
            this.speciality = value;
        }
    }

    handleClear() {
        this.name = '';
        this.speciality = '';
        this.publishFilters();
    }

    handleSearch() {
        this.publishFilters();
    }

    publishFilters() {
        console.log('Publishing filters:', this.name, this.speciality);
        const payload = {
            type: 'filters',
            filters: {
                name: this.name,
                speciality: this.speciality
            }
        };
        publish(this.messageContext, SPEAKER_SELECTION, payload);
        console.log('Filters published');
    }
}