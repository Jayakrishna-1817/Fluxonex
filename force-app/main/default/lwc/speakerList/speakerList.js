import { LightningElement, api, wire, track } from 'lwc';
import { subscribe, publish, MessageContext } from 'lightning/messageService';
import SPEAKER_SELECTION from '@salesforce/messageChannel/speakerSelection__c';
import searchSpeakers from '@salesforce/apex/SpeakerService.searchSpeakers';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

const COLUMNS = [
    { label: 'Name', fieldName: 'name', type: 'text', sortable: true },
    { label: 'Email', fieldName: 'email', type: 'email' },
    { label: 'Speciality', fieldName: 'speciality', type: 'text' },
    {
        type: 'button',
        typeAttributes: {
            label: 'Book Session',
            name: 'book',
            title: 'Book Session',
            variant: 'brand'
        }
    }
];

export default class SpeakerList extends LightningElement {
    static renderMode = 'light';
    static delegatesFocus = true;

    @track data = [];
    @track columns = COLUMNS;
    @track sortBy;
    @track sortDirection = 'asc';
    @track loading = false;

    filters = { name: '', speciality: '' };

    @wire(MessageContext) messageContext;
    subscription;

    connectedCallback() {
        this.subscribeToFilters();
    }

    subscribeToFilters() {
        console.log('Subscribing to speaker selection messages');
        if (this.subscription) return;
        this.subscription = subscribe(this.messageContext, SPEAKER_SELECTION, (message) => {
            if (message?.type === 'filters') {
                this.filters = { ...message.filters };
                 console.log('Filters received:', this.filters);
                this.fetchSpeakers();
               
            }
        });
    }

    async fetchSpeakers() {
        this.loading = true;
        try {
            const result = await searchSpeakers({
                name: this.filters?.name || '',
                speciality: this.filters?.speciality || ''
            });
            this.data = Array.isArray(result) ? result : [];
            console.log('Speakers loaded:', this.data);
        } catch (e) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error loading speakers',
                    message: e?.body?.message || e.message || 'Unknown error',
                    variant: 'error'
                })
            );
            this.data = [];
        } finally {
            this.loading = false;
        }
    }

    handleRowAction(event) {
        const actionName = event.detail.action.name;
        const row = event.detail.row;
        if (actionName === 'book') {
            this.publishSelection(row);
        }
    }

    publishSelection(row) {
        const evt = new CustomEvent('speakerclick', { detail: { id: row.id } });
        this.dispatchEvent(evt);

        const payload = {
            type: 'selection',
            speaker: {
                id: row.id,
                name: row.name,
                email: row.email,
                speciality: row.speciality
            }
        };
        publish(this.messageContext, SPEAKER_SELECTION, payload);
    }

    handleSort(event) {
        const { fieldName: sortedBy, sortDirection } = event.detail;
        this.sortBy = sortedBy;
        this.sortDirection = sortDirection;
        const cloneData = [...this.data];
        cloneData.sort((a, b) => {
            const v1 = (a[sortedBy] || '').toString().toLowerCase();
            const v2 = (b[sortedBy] || '').toString().toLowerCase();
            if (v1 === v2) return 0;
            const res = v1 > v2 ? 1 : -1;
            return sortDirection === 'asc' ? res : -1 * res;
        });
        this.data = cloneData;
    }
}