import Link from 'next/link';
import { InfoPage } from '@/components/site/InfoPage';
import { integrationConfig } from '@/lib/integration-config';
import { formatPublishingDateLong, PUBLISHING_SNAPSHOT_DATE } from '@/lib/publishing';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(
  'User agreement',
  'The CostAnswer user agreement: what the calculators are, what a result is not, how stored government data is used, and the limits of liability.',
  '/terms',
);

const CONTENTS = [
  { id: 'agreement', label: 'Agreement' },
  { id: 'the-service', label: 'The service' },
  { id: 'who-it-is-for', label: 'Who it is for' },
  { id: 'children', label: 'Children' },
  { id: 'no-advice', label: 'No professional advice' },
  { id: 'how-results-are-produced', label: 'How results are produced' },
  { id: 'third-party-data', label: 'Government data' },
  { id: 'third-party-sites', label: 'Other websites' },
  { id: 'your-inputs', label: 'Your inputs' },
  { id: 'license', label: 'License to use' },
  { id: 'intellectual-property', label: 'Intellectual property' },
  { id: 'prohibited-use', label: 'Prohibited use' },
  { id: 'feedback', label: 'Corrections and feedback' },
  { id: 'advertising', label: 'Advertising' },
  { id: 'availability', label: 'Availability' },
  { id: 'disclaimer', label: 'No warranty' },
  { id: 'liability', label: 'Liability' },
  { id: 'indemnity', label: 'Indemnity' },
  { id: 'changes', label: 'Changes' },
  { id: 'law', label: 'Governing law' },
  { id: 'contact', label: 'Contact' },
];

export default function TermsPage() {
  const effective = formatPublishingDateLong(integrationConfig.privacyEffectiveDate ?? PUBLISHING_SNAPSHOT_DATE);

  return (
    <InfoPage
      eyebrow="User agreement"
      title="User agreement"
      intro="These terms govern your use of CostAnswer. If you use a calculator, you agree to them. If you do not agree, do not use the site."
      effective={effective}
      contents={CONTENTS}
      currentPolicy="/terms"
    >
      <h2 id="agreement">1. Agreement</h2>
      <p>
        This user agreement is a contract between you and the operator of CostAnswer for use of the website,
        the calculators, the stored datasets, and any application programming interfaces published on the same
        origin. It applies each time you load a page, run a calculation, follow a link, or call an endpoint on
        the site. The <Link href="/privacy">privacy policy</Link> is part of this agreement. If the two conflict
        on how inputs are handled, the privacy policy controls that subject.
      </p>
      <p>
        By using the site you represent that you have read this agreement and the privacy policy, that you have
        the legal capacity to enter the contract, and that you will not use a result as if it were advice,
        a filing, a quote, or an official determination.
      </p>
      <p>
        We may change these terms. The version on this page, with the effective date above, is the one that
        applies. Continued use after a change is acceptance of the new terms. If you do not accept a change,
        stop using the site.
      </p>

      <h2 id="the-service">2. The service</h2>
      <p>
        CostAnswer publishes free U.S. calculators. A page collects the numbers you type, runs a tested formula
        in your browser, and shows the arithmetic. When a figure did not come from you, it comes from a dated
        copy of a U.S. public dataset stored on this site. The formula version and, when data was used, the
        dataset snapshot id are printed under Technical details.
      </p>
      <p>
        The service includes topic hubs, search, methodology pages, data-source pages, this legal set, and any
        lookup endpoints that support a calculator (for example mapping a ZIP code to a GSA locality). It does
        not include accounts, saved scenarios, live broker quotes, prepared tax returns, clinical assessments,
        travel authorization, or the ability to file anything with a government agency.
      </p>
      <p>
        We may add, change, or remove a calculator, a dataset, an endpoint, or a page at any time. We may pause
        the site for maintenance. We do not promise uninterrupted access, a particular catalogue, or that a
        calculator that exists today will exist tomorrow.
      </p>

      <h2 id="who-it-is-for">3. Who it is for</h2>
      <p>
        The calculators are written for people in the United States. A state, ZIP code, county, or federal
        fiscal year on a page is that place or calendar. It is not a substitute for another country, a U.S.
        territory GSA does not cover, a foreign per diem, or a local rule the snapshot does not contain.
      </p>
      <p>
        You must be able to form a contract under the law that applies to you. If you use the site for an
        employer, a client, or an agency, you still accept these terms personally, and you confirm you have
        authority to bind that organization to them.
      </p>
      <p>
        Using CostAnswer for work does not make the operator your contractor, your tax preparer, your lender,
        or your travel office. The person or office that has to sign the loan, the return, the voucher, or the
        bid remains responsible for that document.
      </p>

      <h2 id="children">4. Children</h2>
      <p>
        The site is not directed at children under 13, and they may not use it. If you are 13 or older and
        under 18, you may use the calculators only with a parent or guardian who accepts this agreement on
        your behalf.
      </p>
      <p>
        Health calculators (BMI, BMR, TDEE, calorie, body fat) use adult formulas. They are not for children
        even when a parent is supervising. School-grade and GPA pages are arithmetic on the marks you type;
        they are not a school record.
      </p>

      <h2 id="no-advice">5. No professional advice</h2>
      <p>
        CostAnswer does not give legal, tax, accounting, insurance, investment, medical, nutritional, or
        travel-authorization advice. Nothing on the site is an offer to lend, a quote from a lender, a
        securities recommendation, an appraisal, a diagnosis, or a professional-client relationship. Displaying
        a government rate or a tax table does not make the operator a government agency or a tax preparer.
      </p>
      <p>
        Money and housing. A mortgage, refinance, loan, interest, or affordability result is an illustration
        from the inputs and, where used, a national average rate. It is not pre-approval, underwriting, or the
        payment you will be offered. Closing costs, points, discount, mortgage insurance, escrow, and lender
        fees vary. A page that starts from principal and interest is not a PITI quote unless it says it has
        included tax and insurance, and even then those lines are estimates.
      </p>
      <p>
        Tax and pay. Salary-after-tax, paycheck, and bonus figures estimate federal income tax, FICA, and state
        wage tax only where this site has a verified schedule for that year. They omit many credits, deductions,
        local taxes, and payroll-specific rules. They are not Form 1040, a W-2, a W-4 election, or a filing.
        Supplemental-wage withholding on a bonus is not the tax you will owe on that bonus for the year.
      </p>
      <p>
        Health. BMI, BMR, TDEE, calorie, and body-fat pages use published adult formulas with the limits shown
        on each page. They are not a diagnosis, a treatment plan, or medical care. They are not for children.
        They do not replace a clinician.
      </p>
      <p>
        Travel. GSA per diem figures are federal ceilings for continental U.S. travel. They are not authorization
        to travel, a hotel reservation, or your employer’s policy. Lodging tax is reimbursed separately under
        GSA rules and is not inside the cap. A ZIP lookup that lands on the standard CONUS rate, or that offers
        a county rate and a city carve-out, is a map of GSA’s tables, not a determination that a particular
        hotel night is reimbursable.
      </p>
      <p>
        Construction and energy. Concrete, square footage, electricity, and fuel pages separate measured
        quantities from waste, fixed utility charges, and local prices. A bag count or a bill estimate is a
        planning number, not a bid, not a permit, and not your utility tariff.
      </p>
      <p>
        If you need a decision that has to hold up at a bank, an agency, a clinic, a court, or an employer, use
        the official source named on the page or a person licensed to give that advice.
      </p>

      <h2 id="how-results-are-produced">6. How results are produced</h2>
      <p>
        The form, the formula, and the data are separate. Calculators do not fetch live data while you type. A
        stored snapshot is hashed. The site will not build if that file no longer matches the hash it was
        reviewed under. Same inputs and the same Method version should produce the same answer.
      </p>
      <p>
        Lookup endpoints that support a calculator (ZIP to county, place search) return a stored mapping. They
        are not a live query of Census, GSA, or any other agency at the moment you type. If the mapping file is
        older than a later agency release, the page still reports the snapshot it used.
      </p>
      <p>
        Models leave things out on purpose. Where they do, the page says so next to the answer: depreciation,
        healthcare, withholding tables, lodging tax, local fees, waste factors, and similar gaps. Those
        omissions are part of the result. Filling them in from memory does not make the number official.
      </p>
      <p>
        You can type a number wrong. A snapshot can lag the provider. Official series get revised after this
        site stored a copy. When a release is overdue, the page says so. None of that is hidden, and none of it
        is a promise that the figure is complete, current, or right for your case.
      </p>

      <h2 id="third-party-data">7. Government and third-party data</h2>
      <p>
        Datasets on this site come from U.S. public sources, including Freddie Mac, the Energy Information
        Administration, the Bureau of Labor Statistics, the IRS, the Social Security Administration, HUD, the
        Census Bureau, the Bureau of Economic Analysis, USDA, and the General Services Administration. Each
        copy is listed on the <Link href="/methodology/data">data sources</Link> page with its period and
        publication date. How those copies are chosen and checked is described on the{' '}
        <Link href="/methodology">methodology</Link> page.
      </p>
      <p>
        Those agencies are not authors of CostAnswer, do not endorse the calculators, and are not responsible
        for how a stored copy is used here. Their terms, revision policies, and later releases control the
        underlying series. If a source revises a figure, this site updates when a new snapshot is ingested and
        verified. Until then, the printed snapshot id is the copy that produced your result.
      </p>
      <p>
        Public-domain status of an underlying table does not give you a license to copy CostAnswer’s engines,
        page copy, arrangement of the catalogue, or the particular snapshot files as packaged on this site.
      </p>

      <h2 id="third-party-sites">8. Other websites</h2>
      <p>
        Calculator pages and data pages link to the official publication we stored a copy of. Those sites have
        their own terms, privacy practices, and revision calendars. We do not control them, and a link is not
        an endorsement of anything else on that domain.
      </p>
      <p>
        If an official URL moves or a PDF is replaced, the snapshot id on CostAnswer still names the copy that
        produced a past result. The live agency page may already show a later number.
      </p>

      <h2 id="your-inputs">9. Your inputs and privacy</h2>
      <p>
        What you type stays in your browser. Pay, balances, dates, ZIP codes, quantities, and similar inputs
        are not sent to CostAnswer to store, profile, or sell. Lookup requests that a calculator has to make
        (a ZIP code to resolve a locality, a place name to find a geography) send only what that endpoint needs
        to return a mapping. They are not used to build a profile. How visits are counted, and whether
        advertising is on, is stated from the live configuration on the <Link href="/privacy">privacy page</Link>.
      </p>
      <p>
        Do not paste secrets into a calculator: account numbers, Social Security numbers, medical record
        identifiers, passwords, or tax-return attachments. The pages do not need them. If you send a
        correction, follow the contact page and do not attach those documents.
      </p>
      <p>
        Browser storage on your device (if a page uses it for a session) is under your control. Clearing the
        browser clears it. It is not an account.
      </p>

      <h2 id="license">10. License to use the site</h2>
      <p>
        We grant you a limited, revocable, non-exclusive, non-transferable license to load the public pages and
        run the calculators for your own questions, including questions you work through for an employer or a
        client. You may link to any public URL. You may quote a short passage with a link back to the page you
        quoted.
      </p>
      <p>
        The license is for human use of the published pages. It is not a dump of the dataset, not an API
        subscription, and not permission to operate a competing copy of the service from our files, our
        snapshots, or our HTML. Automated access is allowed only to the extent a well-behaved crawler fetching
        public pages for search or archiving would be, and only if it does not degrade the service.
      </p>

      <h2 id="intellectual-property">11. Intellectual property</h2>
      <p>
        The CostAnswer name, the layout of the catalogue, the calculator copy, the engines, the tests, and the
        particular packaged snapshots on this origin remain ours or remain subject to the rights of the original
        data providers. U.S. government works in the public domain stay in the public domain. Packaging them
        with a Method version, a hash, and a page that runs a formula does not put the underlying table under
        our copyright, and it does not put our software in the public domain.
      </p>
      <p>
        You do not acquire any ownership by using a calculator, taking a screenshot, or quoting a short
        passage. Trademarks of Freddie Mac, GSA, IRS, and other sources remain theirs. We use the names of
        those sources to identify the series we stored, which is the ordinary way to cite a public table.
      </p>

      <h2 id="prohibited-use">12. Prohibited use</h2>
      <p>You may not:</p>
      <ul>
        <li>Copy the calculators, the catalogue, or the packaged snapshots and present them as your own product.</li>
        <li>Frame, scrape, or wrap the pages so they appear to belong to another site.</li>
        <li>Send automated traffic that degrades the service for other readers, including bulk harvesting of every route or every ZIP lookup.</li>
        <li>Probe, overload, or attempt to break the pages, ingestion, hashes, or stored snapshots.</li>
        <li>Remove Method versions, snapshot ids, source citations, or these terms from material you quote.</li>
        <li>Use the site to mislead someone about a loan, a tax filing, a medical fact, or a government rate.</li>
        <li>Resell access to the calculators or charge a third party as if CostAnswer were your hosted product.</li>
        <li>Use the site where U.S. law or the law that applies to you forbids it.</li>
      </ul>
      <p>
        We may rate-limit, block, or refuse access that harms the service or other readers, with or without
        notice. That does not waive any other remedy.
      </p>

      <h2 id="feedback">13. Corrections and feedback</h2>
      <p>
        If a figure looks wrong, use the <Link href="/contact">contact</Link> page. A report we can check
        includes the page URL, the Method version, the Data snapshot id, what you typed, what the page showed,
        and the official table you expected. The same form takes a calculator request, a complaint about the
        product, or a suggestion. Do not send paystubs, tax returns, account numbers, or medical records.
      </p>
      <p>
        If you send a correction, a calculator request, a complaint, a suggestion, or other feedback, you grant
        the operator a worldwide, royalty-free, irrevocable license to use it to operate and improve the site.
        You confirm it is yours to send and that it does not include confidential information. Sending feedback
        does not create a duty to reply, to build a calculator, or to keep a particular Method version.
      </p>

      <h2 id="advertising">14. Advertising</h2>
      <p>
        Some layouts reserve a slot for advertising. No ad network, tag, or tracker loads unless the privacy
        page says advertising is on. That flag cannot be turned on in software without a public contact address
        and a dated privacy policy. If ads are later enabled, they are subject to this agreement and to the
        notice shown at the time. Sponsored placements, if any, will be labelled. Government datasets on the
        data pages are not paid placements.
      </p>
      <p>
        Some calculator result pages may show partner or affiliate offers when that flag is on and a real
        program URL is configured. Those offers are advertising. They are not CostAnswer’s answer, not a
        lender decision, and not financial, tax, or legal advice. Example partner names in configuration are
        placeholders until a contract and URL exist. A disclosure sits on the slot.
      </p>
      <p>
        Third-party ads, if enabled, are not CostAnswer content. Their terms and privacy notices apply to the
        network that serves them. We do not warrant those ads.
      </p>

      <h2 id="availability">15. Availability</h2>
      <p>
        The site is provided when it is up. There is no service-level agreement, no promised uptime, and no
        promised response time for a correction. Lookup endpoints may be rate-limited. A calculator may be
        withdrawn if the underlying snapshot cannot be verified.
      </p>
      <p>
        We are not liable for a period when the site is down, slow, or missing a page you used last week. If
        you need a number for a filing deadline, a closing, or a voucher, obtain it from the official source
        or from a person who can stand behind it. CostAnswer is not that person.
      </p>

      <h2 id="disclaimer">16. No warranty</h2>
      <p>
        The site, the calculators, the lookup endpoints, and the stored datasets are provided as they are and
        as available. To the fullest extent the law allows, we disclaim all warranties, express or implied,
        including merchantability, fitness for a particular purpose, title, and non-infringement.
      </p>
      <p>
        We do not warrant that a result is accurate, complete, current, or suitable for a loan, a filing, a
        diagnosis, a bid, a trip, a reimbursement, or any other decision. We do not warrant that the site will
        be uninterrupted, secure, or free of defects. You use it at your own risk.
      </p>

      <h2 id="liability">17. Limitation of liability</h2>
      <p>
        You are responsible for what you do with a number from this site. To the fullest extent the law allows,
        CostAnswer and the people who operate it are not liable for any indirect, incidental, special,
        consequential, exemplary, or punitive loss, or for lost profits, lost data, or lost opportunity, arising
        from the site, from being unable to use it, from relying on a figure, or from a dataset that had not
        been updated yet.
      </p>
      <p>
        That includes a loan you took or did not take, a tax position, a purchase, a medical choice, a
        construction quantity, an energy bill, and a travel claim. Direct damages, if a court finds any cannot
        be excluded, are limited to fifty U.S. dollars in aggregate, or the smallest amount the law allows if
        that cap is not permitted.
      </p>
      <p>
        Some jurisdictions do not allow certain limits. In those places, the limit applies only as far as that
        law requires. The rest of this agreement still stands.
      </p>

      <h2 id="indemnity">18. Indemnity</h2>
      <p>
        If you use the site in a way that breaks these terms, or you present a CostAnswer result as advice,
        as a filing, as a quote, or as someone else’s work, you will defend and indemnify the operator against
        claims, damages, and reasonable legal costs that come from that use, to the extent the law allows.
      </p>

      <h2 id="changes">19. Changes and termination</h2>
      <p>
        We may change a calculator, a dataset, these terms, or the privacy policy. An older Method version
        keeps that version; a new engine gets a new string. An older snapshot id still names the copy that
        produced a past result.
      </p>
      <p>
        We may stop offering the site. Your license ends if you break these terms or if we withdraw the
        service. Sections that by their nature should survive (no advice, intellectual property, no warranty,
        liability, indemnity, governing law) survive.
      </p>

      <h2 id="law">20. Governing law</h2>
      <p>
        These terms are governed by the laws of the United States and, where a state law must be chosen, the
        state in which the operator maintains the service, without regard to conflict-of-law rules. Courts
        there have exclusive jurisdiction, except that we may seek injunctive relief in any court to stop
        scraping, framing, or other misuse of the site.
      </p>
      <p>
        If a court strikes one clause, the rest of the agreement remains in force. A failure to enforce a
        clause once is not a waiver of it. This is the entire agreement for use of the site. It replaces prior
        terms for that use. A printed or saved copy of this page is evidence of the terms that applied on the
        date shown above, not of any later version.
      </p>

      <h2 id="contact">21. Contact</h2>
      <p>
        Report a wrong figure, request a calculator, or send a complaint or suggestion on the{' '}
        <Link href="/contact">contact</Link> page. For a wrong figure, include the page URL and the Method and
        Data lines from Technical details. Questions about this agreement go to the same place. The{' '}
        <Link href="/faq">FAQ</Link> answers common questions about data, privacy, and what a result is not.
      </p>
    </InfoPage>
  );
}
